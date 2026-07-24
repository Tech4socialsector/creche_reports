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
// 		this._elevate_frappe_alerts(); // keep Frappe toasts above our modals
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
// 				<div id="cbd_chart_hd" class="cbd-section-hd" style="display:none">
// 					<span class="cbd-section-hd__label">Comparison Charts</span>
// 					<span class="cbd-section-hd__line"></span>
// 				</div>
// 				<div class="cbd-chart-card" id="cbd_chart_card" style="display:none">
// 					<div class="cbd-chart-card__legend" id="cbd_chart_legend"></div>
// 					<div class="cbd-chart-card__body" id="cbd_chart_body"></div>
// 				</div>
// 			</div>
// 		`);

// 		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
// 		// Apply button removed — filters auto-apply on change (debounced)

// 		this._inject_styles();
// 		this._ensure_panels();
// 		this._build_filters();
// 	}

// 	_init_with_permissions() {
// 		frappe.dom.freeze('Loading…');
// 		frappe.call({ method: 'creche_reports.api.creche_dashboard.get_user_permission_scope' })
// 			.then(r => { this._user_permission_scope = r.message || null; })
// 			.catch(() => { this._user_permission_scope = null; });
// 		frappe.call({
// 			method: 'creche_reports.api.creche_dashboard.get_partner_options',
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
// 			const todayStr = frappe.datetime.get_today();
// 			this.load_data({ partner_id: partner_ids, end_date: todayStr });
// 		}).catch(() => {
// 			frappe.dom.unfreeze();
// 			this.load_data({ end_date: frappe.datetime.get_today() });
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
// 					method: 'creche_reports.api.creche_dashboard.get_partner_options',
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
// 					this._debounce_load();
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
// 				change: () => { this._sel.budget_ref = budget_ref_ctrl.get_value() || []; this._debounce_load(); },
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
// 				change: () => { this._sel.grant_id = grant_id_ctrl.get_value() || []; this._debounce_load(); },
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
// 					this._debounce_load();
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
// 					this._debounce_load();
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
// 					this._debounce_load();
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
// 					this._debounce_load();
// 				},
// 			},
// 			render_input: true,
// 		});
// 		end_ctrl.refresh();
// 		this._fields.end_date = end_ctrl;
// 		// Default End Date to today. This also makes the Start/End Date
// 		// filter group show by default (instead of Financial Year/Month)
// 		// since _setup_filter_visibility treats a populated date field as
// 		// the active filter group.
// 		try { end_ctrl.set_value(frappe.datetime.get_today()); } catch(e) {}
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
// 					change: () => { this._sel[key] = ctrl.get_value() || []; this._debounce_load(); },
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


// 	// Auto-apply debounce: called from every filter change; waits 700ms before loading
// 	_debounce_load(delay_ms = 700) {
// 		clearTimeout(this._load_debounce_timer);
// 		this._load_debounce_timer = setTimeout(() => {
// 			this.load_data(this._get_effective_filters());
// 		}, delay_ms);
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

// 	// ── CHANGE #10: compress month list to "min → max" range display ──
// 	_compress_month_label(months_arr, financial_years_arr) {
// 		if (!months_arr || !months_arr.length) return null;
// 		const MONTH_ORDER = ['January','February','March','April','May','June',
// 		                     'July','August','September','October','November','December'];
// 		const sorted = [...months_arr].sort((a,b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
// 		if (sorted.length === 1) return sorted[0];
// 		if (sorted.length === 12) return 'All Months';
// 		// Show min to max
// 		return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
// 	}

// 	_filter_period_label() {
// 		const pf = this._panel_filters();
// 		const af = this._active_filters || {};
// 		const hasFY    = !!(af.financial_year && af.financial_year.length);
// 		const hasMonth = !!(af.month && af.month.length);
// 		const hasDate  = !!(pf.start_date || pf.end_date);
// 		const active   = hasFY || hasMonth || hasDate;

// 		let label = 'Amount';
// 		if (hasFY && hasMonth) {
// 			const fyStr = af.financial_year.join(', ');
// 			const mnStr = this._compress_month_label(af.month);
// 			label = `${fyStr} — ${mnStr}`;
// 		} else if (hasFY) {
// 			label = af.financial_year.join(', ');
// 		} else if (hasMonth) {
// 			label = this._compress_month_label(af.month);
// 		} else if (hasDate) {
// 			label = `${pf.start_date||''}${pf.end_date?' → '+pf.end_date:''}`;
// 		}

// 		return { active, label, hasFY, hasMonth, hasDate };
// 	}

// 	load_data(filters) {
// 		this._active_filters = filters || {};
// 		frappe.call({
// 			method: 'creche_reports.api.creche_dashboard.get_partner_budget_summary',
// 			freeze: true, freeze_message: 'Loading budget summary…',
// 			args: { filters: filters || {} },
// 			callback: (r) => {
// 				if (!r.message) return;
// 				this._all_partners = r.message.partners || [];
// 				this.render_summary(r.message.summary, r.message.partners || []);
// 				this.render_partners(r.message.partners);
// 			}
// 		});
// 	}


// 	// ═══════════════════════════════════════════════════════════════════════
// 	// CARD DESIGN  — render_summary  (8 cards)
// 	// CHANGE #4: Added "Expected Bank Balance" card (disbursement - utilisation)
// 	// CHANGE #5: "Unutilized Disb – Bank Bal." renamed to "Unutilized Disbursement"
// 	//            and value changed to disbursement - reported bank balance
// 	// ═══════════════════════════════════════════════════════════════════════

// 	render_summary(s, partners) {
// 		if (!s) return;
// 		const el = document.getElementById('cbd_summary_cards');
// 		if (!el) return;

// 		const bank_bal            = parseFloat(s.total_bank_balance) || 0;
// 		const total_disb          = parseFloat(s.total_disbursement)  || 0;
// 		const total_util          = parseFloat(s.total_utilisation)   || 0;
// 		const total_budget        = parseFloat(s.total_budget)        || 0;
// 		const interest_earned     = parseFloat(s.total_interest)     || 0;

// 		// ── Derived metrics (raw — no Math.max — so drill total = card always) ──
// 		const remaining_budget    = total_budget - total_util;      // Budget remaining to spend
// 		const unspent_disb        = total_disb   - total_util;      // Disbursed but not yet utilised (should ≈ bank)
// 		const bank_variance       = unspent_disb - bank_bal;        // Gap between expected & reported bank balance
// 		// Keep aliases for drill-down CFG compatibility
// 		const expected_bank_bal   = unspent_disb;
// 		const bank_bal_gap        = bank_variance;
// 		const unutilised_disb     = unspent_disb;

// 		// Partners who have utilised ≥85% of what's been disbursed to them
// 		const partners_80pct_list = (partners || []).filter(p => {
// 			const disb = parseFloat(p.total_disbursement) || 0;
// 			const util = parseFloat(p.total_utilisation) || 0;
// 			return disb > 0 && (util / disb) >= 0.85;
// 		});

// 		// ── 8-card layout — tells a complete financial story ─────────────────
// 		// Row 1: Budget story  →  Row 2: Cash & compliance
// 		const CARDS = [
// 			// ── Budget Flow ──────────────────────────────────────────────────────
// 			{
// 				panel:'budget', label:'Approved Budget', raw: total_budget, base: total_budget, accent:'#2563eb',
// 				subLabel: 'Total sanctioned grant amount',
// 			},
// 			{
// 				panel:'disbursement', label:'Total Disbursement', raw: total_disb, base: total_budget, accent:'#059669',
// 				subLabel: `${parseFloat(s.disbursement_pct||0).toFixed(1)}% of approved budget transferred`,
// 			},
// 			{
// 				panel:'utilisation', label:'Total Utilisation', raw: total_util, base: total_disb, accent:'#d97706',
// 				subLabel: `${(total_disb > 0 ? (total_util / total_disb * 100) : 0).toFixed(1)}% of disbursed amount utilised`,
// 			},
// 			{
// 				panel:'remaining_budget', label:'Balance Budget to be Disbursed', raw: remaining_budget, base: total_budget,
// 				accent: remaining_budget < 0 ? '#dc2626' : '#7c3aed',
// 				subLabel: remaining_budget < 0 ? '⚠ Over-utilized beyond approved budget' : 'Approved budget yet to be spent',
// 			},
// 			// ── Cash Position ─────────────────────────────────────────────────────
// 			{
// 				panel:'unspent_disb', label:'Expected Bank Balance', raw: unspent_disb, base: total_disb,
// 				accent: unspent_disb < 0 ? '#dc2626' : '#0d9488',
// 				subLabel: unspent_disb < 0 ? '⚠ Partners spent more than released' : 'Released but not yet reported as spent',
// 			},
// 			{
// 				panel:'bank_balance', label:'Reported Bank Balance', raw: bank_bal, base: total_disb, accent:'#0891b2',
// 				subLabel: 'Self-reported cash balance in partner accounts',
// 			},
// 			{
// 				panel:'bank_variance', label:'Bank Balance Difference', raw: bank_variance, base: total_disb,
// 				accent: Math.abs(bank_variance) < 1 ? '#16a34a' : bank_variance < 0 ? '#dc2626' : '#be185d',
// 				subLabel: Math.abs(bank_variance) < 1 ? '✓ Bank matches expected amount'
// 					: bank_variance < 0 ? '⚠ Bank higher than expected — review funds'
// 					: '⚠ Bank lower than expected — possible unreported spend',
// 			},
// 			// ── Compliance ────────────────────────────────────────────────────────
// 			{
// 				panel:'partners_80pct', label:'Partners with 85%+ Disbursement Utilization', count: partners_80pct_list.length,
// 				accent:'#15803d',
// 				subLabel: 'Partners who have utilised ≥85% of funds disbursed to them',
// 			},
// 			{
// 				panel:'pending_util', label:'Pending Utilization Submission',
// 				raw: null, count:'…', loading: true, accent:'#dc2626',
// 				subLabel: 'Partners who haven\'t submitted utilization',
// 			},
// 		];

// 		el.innerHTML = CARDS.map(c => {
// 			const pct = (!c.loading && c.base > 0 && c.raw !== null) ? (c.raw / c.base * 100) : null;
// 			const numHtml = c.count !== undefined
// 				? `<div class="cbd-scard__num" style="color:${c.accent}">${c.count}</div>`
// 				: `<div class="cbd-scard__num" style="color:${c.accent}">${this._fmtCard(c.raw, c.label)}</div>`;
// 			const subText = c.loading
// 				? 'Loading…'
// 				: (pct !== null
// 					? `<span class="cbd-scard__pct-badge" style="background:${c.accent}1f;color:${c.accent}">${pct.toFixed(1)}%</span> of total`
// 					: (c.subLabel || ''));

// 			// Whole-card tooltip content — same info as the number's own
// 			// tooltip, so hovering anywhere on the card (not just the
// 			// number) shows it.
// 			let cardTip;
// 			if (c.loading) {
// 				cardTip = '';
// 			} else if (c.count !== undefined) {
// 				cardTip = c.subLabel || `${c.count}`;
// 			} else {
// 				cardTip = this._fmtFull(parseFloat(c.raw) || 0);
// 			}
// 			const tipAttrs = cardTip
// 				? `data-tip="${frappe.utils.escape_html(cardTip)}" data-tip-label="${frappe.utils.escape_html(c.label)}"`
// 				: '';

// 			return `
// 			<div class="cbd-scard${cardTip ? ' cbd-tip-wrap cbd-tip-wrap--plain' : ''}" data-panel="${c.panel}" ${tipAttrs} style="border-left-color:${c.accent}">
// 				<div class="cbd-scard__lbl">${c.label}</div>
// 				${numHtml}
// 				<div class="cbd-scard__sub" id="${c.loading ? 'cbd_pending_sub' : ''}">${subText}</div>
// 				<div class="cbd-scard__cta" style="color:${c.accent}">
// 					<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
// 					View Line Items
// 				</div>
// 			</div>`;
// 		}).join('');

// 		const pfo_old = document.getElementById('cbd_pfo_banner');
// 		if (pfo_old) pfo_old.remove();

// 		el.querySelectorAll('.cbd-scard').forEach(card => {
// 			card.addEventListener('click', () => {
// 				const panel = card.dataset.panel;
// 				if (panel === 'budget')            this._open_drill_modal('budget');
// 				else if (panel === 'utilisation')  this._open_drill_modal('utilisation');
// 				else if (panel === 'disbursement') this._open_drill_modal('disbursement');
// 				else if (panel === 'pending_util') this._open_pending_utilisation_modal();
// 				else if (panel === 'partners_80pct') this._open_partners_80pct_modal();
// 				else this._open_card_drill_modal(panel);
// 			});
// 		});

// 		this._last_summary = s;
// 		this._approved_creches_count = parseFloat(s.total_creches) || 0;
// 		this._render_partner_chart();
// 		this._render_analytics_charts(s, partners || []);
// 		this._load_pending_utilisation_count();
// 	}

// 	// Ensure any dynamically-added Frappe toasts/alerts always appear above our modals
// 	_elevate_frappe_alerts() {
// 		if (this._alertObserver) return; // run only once
// 		const SELECTORS = [
// 			'.frappe-toast-area', '.frappe-alert', '.alert-container',
// 			'.toast-container', '.notification-container',
// 			'.frappe-toast', '[data-frappe-toast]',
// 		];
// 		const elevate = () => {
// 			SELECTORS.forEach(sel => {
// 				document.querySelectorAll(sel).forEach(el => {
// 					el.style.setProperty('z-index', '99999', 'important');
// 					if (!el.style.position || el.style.position === 'static')
// 						el.style.position = 'fixed';
// 				});
// 			});
// 		};
// 		this._alertObserver = new MutationObserver(elevate);
// 		this._alertObserver.observe(document.body, { childList: true, subtree: true });
// 		elevate(); // also elevate any already-present alerts
// 	}

// 	// ── FIX ──
// 	// "Pending as of" should mean "as of the End Date filter, has the
// 	// PREVIOUS month's utilisation (and any earlier month, per each
// 	// budget's own start date) been submitted" — not the End Date's own
// 	// month, since that month is usually still in progress and isn't due
// 	// yet. E.g. End Date = 08/07/2026 → check June 2026 and earlier.
// 	// The backend already caps the earliest month checked at each
// 	// budget's start_date, so shifting only the far end here is enough.
// 	_pending_cutoff_from_end_date(endDateStr) {
// 		const parts = String(endDateStr || '').split('-').map(Number);
// 		if (parts.length !== 3 || parts.some(isNaN)) return endDateStr;
// 		const [y, m] = parts; // m is 1-indexed month of the selected End Date
// 		// Day 0 of the selected month == the last day of the previous month.
// 		const prevMonthEnd = new Date(y, m - 1, 0);
// 		const yy = prevMonthEnd.getFullYear();
// 		const mm = String(prevMonthEnd.getMonth() + 1).padStart(2, '0');
// 		const dd = String(prevMonthEnd.getDate()).padStart(2, '0');
// 		return `${yy}-${mm}-${dd}`;
// 	}

// 	_load_pending_utilisation_count() {
// 		// Cutoff is driven by the dashboard's own End Date filter (which
// 		// defaults to today), shifted back to the end of the PREVIOUS
// 		// month — see _pending_cutoff_from_end_date for why.
// 		const endDate = (this._active_filters && this._active_filters.end_date) || frappe.datetime.get_today();
// 		const cutoff = this._pending_cutoff_from_end_date(endDate);
// 		this._pending_cutoff = cutoff;

// 		frappe.call({
// 			method: 'creche_reports.api.creche_dashboard.get_pending_utilisation_summary',
// 			args: { cutoff_date: cutoff, target_fy: null, target_month: null, filters: JSON.stringify(this._active_filters || {}) },
// 			callback: (r) => {
// 				const data = (r.message && r.message.partners) || [];
// 				this._pending_util_data = data;
// 				const card = document.querySelector('.cbd-scard[data-panel="pending_util"]');
// 				if (card) {
// 					const numEl = card.querySelector('.cbd-scard__num');
// 					const subEl = card.querySelector('#cbd_pending_sub');
// 					if (numEl) numEl.textContent = data.length;
// 					if (subEl) {
// 					subEl.id = '';
// 					const MNAMES = ['January','February','March','April','May','June',
// 					                'July','August','September','October','November','December'];
// 					const parts = String(cutoff).split('-').map(Number);
// 					const cutoffLabel = (parts.length === 3 && !parts.some(isNaN)) ? `${MNAMES[parts[1]-1]} ${parts[0]}` : cutoff;
// 					subEl.textContent = `partner${data.length===1?'':'s'} — through ${cutoffLabel}`;
// 				}
// 				}
// 				this._render_pfo_alert(data);
// 			},
// 			error: () => {
// 				const card = document.querySelector('.cbd-scard[data-panel="pending_util"]');
// 				if (!card) return;
// 				const subEl = card.querySelector('#cbd_pending_sub');
// 				if (subEl) { subEl.id = ''; subEl.textContent = 'Could not load'; }
// 			},
// 		});
// 	}

// 	_render_pfo_alert(data) {
// 		const old = document.getElementById('cbd_pfo_banner');
// 		if (old) old.remove();

// 		const scope = this._user_permission_scope;
// 		if (!scope || !scope.restricted || !scope.partner_ids || scope.partner_ids.length !== 1) return;

// 		const myId  = scope.partner_ids[0];
// 		const myRow = (data || []).find(p => p.partner_id === myId);

// 		const root = document.querySelector('.cbd-root');
// 		const el   = document.getElementById('cbd_summary_cards');
// 		if (!root && !el) return;

// 		const alert = document.createElement('div');
// 		alert.id = 'cbd_pfo_banner';

// 		if (!myRow) {
// 			alert.className = 'cbd-alert cbd-alert--success';
// 			alert.innerHTML = `
// 				<div class="cbd-alert__icon">
// 					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
// 				</div>
// 				<div class="cbd-alert__body">
// 					<span class="cbd-alert__title">All caught up</span>
// 					<span class="cbd-alert__msg">Your utilization reports are submitted and up to date. Thank you!</span>
// 				</div>
// 				<button class="cbd-alert__dismiss" onclick="this.closest('.cbd-alert').remove()" title="Dismiss">
// 					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 				</button>`;
// 		} else {
// 			const overdue = myRow.max_days_overdue > 0;
// 			const months = myRow.budgets.flatMap(b => b.missing_months.map(m => `${m.month} ${m.financial_year}`));
// 			const uniqueMonths = [...new Set(months)];
// 			const monthsText = uniqueMonths.slice(0, 3).join(', ') + (uniqueMonths.length > 3 ? `, +${uniqueMonths.length-3} more` : '');

// 			alert.className = overdue ? 'cbd-alert--danger cbd-alert' : 'cbd-alert--warning cbd-alert';
// 			const title = overdue ? 'Submission Overdue' : 'Action Required';
// 			const icon = overdue
// 				? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
// 				: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
// 			const msg = overdue
// 				? `Your utilization report is <strong>${myRow.max_days_overdue} day${myRow.max_days_overdue===1?'':'s'} overdue</strong> for ${frappe.utils.escape_html(monthsText)}. Please submit it as soon as possible.`
// 				: `Please submit your utilization report for <strong>${frappe.utils.escape_html(monthsText)}</strong> at the earliest.`;

// 			alert.innerHTML = `
// 				<div class="cbd-alert__icon">${icon}</div>
// 				<div class="cbd-alert__body">
// 					<span class="cbd-alert__title">${title}</span>
// 					<span class="cbd-alert__msg">${msg}</span>
// 				</div>
// 				<button class="cbd-alert__dismiss" onclick="this.closest('.cbd-alert').remove()" title="Dismiss">
// 					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 				</button>`;
// 		}

// 		if (root) root.insertBefore(alert, root.firstChild);
// 		else if (el) el.before(alert);
// 	}

// 	// ═══════════════════════════════════════════════════════════════════════
// 	// CHART
// 	// CHANGE #6: Fixed chart — now shows Expected Bank Balance vs Reported Bank Balance
// 	// ═══════════════════════════════════════════════════════════════════════
// 	_render_partner_chart() {
// 		const hd   = document.getElementById('cbd_chart_hd');
// 		const card = document.getElementById('cbd_chart_card');
// 		const body = document.getElementById('cbd_chart_body');
// 		const legendEl = document.getElementById('cbd_chart_legend');
// 		if (!card || !body) return;

// 		const s = this._last_summary;
// 		if (!s) { card.style.display = 'none'; if (hd) hd.style.display = 'none'; return; }
// 		card.style.display = ''; if (hd) hd.style.display = '';

// 		const period = this._filter_period_label();

// 		const budget   = parseFloat(s.total_budget) || 0;
// 		const disb     = parseFloat(s.total_disbursement) || 0;
// 		const util     = parseFloat(s.total_utilisation) || 0;
// 		const bankBal  = parseFloat(s.total_bank_balance) || 0;
// 		// CHANGE #4: Expected Bank Balance = disb - util
// 		const expectedBankBal = disb - util; // raw, consistent with card

// 		legendEl.innerHTML = `
// 			<div class="cbd-chart-legend__items">
// 				<span class="cbd-chart-legend__item" style="font-weight:700;color:#0f172a">Multi-Metric Comparison</span>
// 			</div>
// 			<span class="cbd-chart-legend__period" title="Active filter period">${frappe.utils.escape_html(period.label)}</span>`;

// 		// CHANGE #6: Third donut is now Expected Bank Balance vs Reported Bank Balance
// 		const DONUTS = [
// 			{
// 				title: 'Budget vs Utilisation',
// 				baseLabel: 'Budget', baseVal: budget,
// 				usedLabel: 'Utilised', usedVal: util,
// 				usedColor: '#16a34a', remColor: '#e2e8f0', remLabel: 'Remaining Budget',
// 				drillType: 'utilisation',
// 			},
// 			{
// 				title: 'Disbursement vs Utilisation',
// 				baseLabel: 'Disbursement', baseVal: disb,
// 				usedLabel: 'Utilised', usedVal: util,
// 				usedColor: '#0891b2', remColor: '#fde68a', remLabel: 'Unutilised Disbursement',
// 				drillType: 'disbursement',
// 			},
// 			{
// 				title: 'Expected vs Reported Bank Balance',
// 				baseLabel: 'Expected Bank Balance', baseVal: expectedBankBal,
// 				usedLabel: 'Reported Bank Balance', usedVal: bankBal,
// 				usedColor: '#db2777', remColor: '#e2e8f0', remLabel: 'Bank Balance Difference',
// 				drillType: 'bank_balance',
// 			},
// 		];

// 		const R = 54, CX = 70, CY = 70, STROKE = 20;
// 		const circumference = 2 * Math.PI * R;

// 		const panelsHtml = DONUTS.map((d, di) => {
// 			const base = Math.max(d.baseVal, 0);
// 			const used = Math.max(Math.min(d.usedVal, base), 0);
// 			const rem  = Math.max(base - used, 0);
// 			const overflow = d.usedVal > base && base > 0;

// 			const usedPct = base > 0 ? (used / base * 100) : 0;
// 			const segments = base > 0
// 				? [
// 					{ val: used, color: d.usedColor, label: d.usedLabel, type: d.drillType },
// 					{ val: rem,  color: d.remColor,  label: d.remLabel,  type: d.drillType },
// 				].filter(sg => sg.val > 0)
// 				: [];

// 			let offsetAcc = 0;
// 			const segHtml = segments.map(sg => {
// 				const pct = sg.val / base;
// 				const segLen = pct * circumference;
// 				const dasharray = `${segLen.toFixed(2)} ${(circumference - segLen).toFixed(2)}`;
// 				const dashoffset = (-offsetAcc).toFixed(2);
// 				offsetAcc += segLen;
// 				const tipText = `${this._fmtFull ? this._fmtFull(sg.val) : this._fmt(sg.val)} (${(pct*100).toFixed(1)}%)`;
// 				return `<circle class="cbd-donut__seg cbd-tip-wrap" data-type="${sg.type}" data-tip="${frappe.utils.escape_html(tipText)}" data-tip-label="${frappe.utils.escape_html(sg.label)}"
// 					cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${sg.color}"
// 					stroke-width="${STROKE}" stroke-dasharray="${dasharray}"
// 					stroke-dashoffset="${dashoffset}" transform="rotate(-90 ${CX} ${CY})"></circle>`;
// 			}).join('');

// 			const emptyRing = !segments.length
// 				? `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f1f5f9" stroke-width="${STROKE}"></circle>`
// 				: '';

// 			const legendRows = segments.map(sg => {
// 				const tipText = `${this._fmtFull ? this._fmtFull(sg.val) : this._fmt(sg.val)}`;
// 				return `
// 				<div class="cbd-donut__row cbd-tip-wrap" data-type="${sg.type}" data-tip="${frappe.utils.escape_html(tipText)}" data-tip-label="${frappe.utils.escape_html(sg.label)}">
// 					<span class="cbd-donut__dot" style="background:${sg.color}"></span>
// 					<span class="cbd-donut__row-lbl">${frappe.utils.escape_html(sg.label)}</span>
// 					<span class="cbd-donut__row-val">${this._fmt(sg.val)}</span>
// 				</div>`;
// 			}).join('');

// 			const overflowNote = overflow
// 				? `<div class="cbd-donut__overflow">⚠ ${d.usedLabel} (${this._fmt(d.usedVal)}) exceeds ${d.baseLabel.toLowerCase()}</div>`
// 				: '';

// 			return `
// 			<div class="cbd-donut__panel" data-panel-idx="${di}">
// 				<div class="cbd-donut__panel-title">${d.title}</div>
// 				<div class="cbd-donut">
// 					<div class="cbd-donut__chart">
// 						<svg viewBox="0 0 140 140" width="140" height="140">
// 							${emptyRing}${segHtml}
// 						</svg>
// 						<div class="cbd-donut__center">
// 							<div class="cbd-donut__center-pct">${usedPct.toFixed(0)}%</div>
// 							<div class="cbd-donut__center-lbl">of ${frappe.utils.escape_html(d.baseLabel)}</div>
// 						</div>
// 					</div>
// 					<div class="cbd-donut__legend">${legendRows || '<div class="cbd-donut__empty">No data yet</div>'}</div>
// 				</div>
// 				${overflowNote}
// 			</div>`;
// 		}).join('');

// 		body.innerHTML = `<div class="cbd-donut__grid">${panelsHtml}</div>`;

// 		body.querySelectorAll('.cbd-donut__seg, .cbd-donut__row').forEach(el => {
// 			el.style.cursor = 'pointer';
// 			el.addEventListener('click', () => {
// 				const type = el.dataset.type;
// 				if (type === 'bank_balance' || type === 'unutilised_disb' || type === 'expected_bank_bal' || type === 'bank_bal_gap') {
// 					this._open_card_drill_modal(type);
// 					return;
// 				}
// 				this._open_drill_modal(type === 'budget' || type === 'utilisation' || type === 'disbursement' ? type : 'budget');
// 			});
// 		});
// 	}

// 	// ═══════════════════════════════════════════════════════════════════════
// 	// PENDING UTILIZATION MODAL
// 	// Cutoff is taken from the dashboard's own End Date filter (defaults to
// 	// today) rather than a separate picker inside the popup — this keeps
// 	// the card count and the popup's list always answering the same
// 	// question for the same date.
// 	// ═══════════════════════════════════════════════════════════════════════
// 	_open_pending_utilisation_modal() {
// 		const old = document.getElementById('cbd_drill_wrap');
// 		if (old) old.remove();

// 		const endDate = (this._active_filters && this._active_filters.end_date) || frappe.datetime.get_today();
// 		const cutoff = this._pending_cutoff_from_end_date(endDate);

// 		const wrap = document.createElement('div');
// 		wrap.id = 'cbd_drill_wrap';
// 		wrap.className = 'cbd-dw';
// 		wrap.innerHTML = `
// 			<div class="cbd-dm" id="cbd_dm_box" style="max-width:min(1600px,98vw)">
// 				<!-- Topbar: title + export + close only -->
// 				<div class="cbd-dm__topbar">
// 					<div class="cbd-dm__topbar-left">
// 						<span class="cbd-bc__item cbd-bc__item--active">Pending Utilization Submission</span>
// 					</div>
// 					<div class="cbd-dm__actions">
// 						<div class="cbd-dm__search">
// 							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
// 							<input type="text" class="cbd-dm__search-input" data-tbl="cbd_pu_table" placeholder="Search...">
// 						</div>
// 						<div class="cbd-exp-dd" id="cbd_pu_exp_dd">
// 							<button class="cbd-exp-btn cbd-exp-btn--main" data-tbl="cbd_pu_table" data-fname="Pending_Utilization" data-title="Pending Utilization Submission">
// 								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
// 								Export
// 								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
// 							</button>
// 							<div class="cbd-exp-dd__menu">
// 								<button class="cbd-exp-dd__item" data-fmt="xlsx">Excel (.xlsx)</button>
// 								<button class="cbd-exp-dd__item" data-fmt="pdf">PDF (A4)</button>
// 							</div>
// 						</div>
// 						<button class="cbd-dm__close" title="Close (Esc)">
// 							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 						</button>
// 					</div>
// 				</div>

// 				<!-- Cutoff info -->
// 				<div class="cbd-pu__filterbar">
// 					<div class="cbd-pu__filterbar-left">
// 						<span class="cbd-pu__datelbl">Checking submissions through:</span>
// 						<span id="cbd_pu_dateinfo" style="font-size:12px;font-weight:700;color:#1e3a5f"></span>
// 					</div>
// 				</div>

// 				<div class="cbd-dm__body">
// 					<div class="cbd-dm__tbl-wrap" id="cbd_pu_body">
// 						<div class="cbd-dm__loading">Loading…</div>
// 					</div>
// 				</div>
// 			</div>`;
// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

// 		const _esc = e => { if (e.key === 'Escape') this._close_drill_modal_main(); };
// 		document.addEventListener('keydown', _esc);
// 		wrap._esc = _esc;
// 		wrap.addEventListener('click', e => { if (e.target === wrap) this._close_drill_modal_main(); });

// 		const box = wrap.querySelector('#cbd_dm_box');

// 		// ── Delegated event handler ──
// 		box.addEventListener('click', e => {
// 			if (e.target.closest('.cbd-dm__close')) { this._close_drill_modal_main(); return; }
// 			// Export
// 			const expMain = e.target.closest('.cbd-exp-btn--main');
// 			if (expMain) { e.stopPropagation(); expMain.closest('.cbd-exp-dd').classList.toggle('cbd-exp-dd--open'); return; }
// 			const ddItem = e.target.closest('.cbd-exp-dd__item');
// 			if (ddItem) {
// 				e.stopPropagation();
// 				const dd = ddItem.closest('.cbd-exp-dd');
// 				const mainBtn = dd.querySelector('.cbd-exp-btn--main');
// 				dd.classList.remove('cbd-exp-dd--open');
// 				this._export_table(mainBtn.dataset.tbl, mainBtn.dataset.fname, mainBtn.dataset.title, ddItem.dataset.fmt);
// 				return;
// 			}
// 			// Send Email (per row — the only way to send now)
// 			const sendOne = e.target.closest('.cbd-pu__send-one');
// 			if (sendOne) { this._send_utilisation_reminder([sendOne.dataset.pid], sendOne, null); return; }
// 		});
// 		document.addEventListener('click', e => {
// 			if (!e.target.closest('.cbd-exp-dd')) {
// 				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
// 			}
// 		});
// 		box.addEventListener('input', e => {
// 			const inp = e.target.closest('.cbd-dm__search-input');
// 			if (inp) this._filter_table_rows(inp.dataset.tbl, inp.value);
// 		});

// 		this._reload_pending_util_by_cutoff(cutoff);
// 	}

// 	_reload_pending_util_by_cutoff(cutoff) {
// 		const body = document.getElementById('cbd_pu_body');
// 		if (body) body.innerHTML = '<div class="cbd-dm__loading">Loading…</div>';

// 		const infoEl = document.getElementById('cbd_pu_dateinfo');
// 		if (infoEl) {
// 			const MNAMES = ['January','February','March','April','May','June',
// 			                'July','August','September','October','November','December'];
// 			const parts = String(cutoff).split('-').map(Number);
// 			infoEl.textContent = (parts.length === 3 && !parts.some(isNaN))
// 				? `${MNAMES[parts[1]-1]} ${parts[0]}`
// 				: frappe.datetime.str_to_user(cutoff);
// 		}

// 		frappe.call({
// 			method: 'creche_reports.api.creche_dashboard.get_pending_utilisation_summary',
// 			args: { cutoff_date: cutoff, target_fy: null, target_month: null, filters: JSON.stringify(this._active_filters || {}) },
// 			callback: (r) => {
// 				const data = (r.message && r.message.partners) || [];
// 				this._pending_util_data = data;
// 				this._render_pending_utilisation_rows(data);
// 			},
// 			error: () => {
// 				if (body) body.innerHTML = '<div class="cbd-dm__empty">Failed to load data.</div>';
// 			},
// 		});
// 	}

// 		_render_pending_utilisation_rows(data) {
// 		const body = document.getElementById('cbd_pu_body');
// 		if (!body) return;

// 		if (!data.length) {
// 			body.innerHTML = `<div class="cbd-dm__empty">
// 				<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
// 				<div style="margin-top:8px;font-weight:600;color:#16a34a">All partners are up to date</div>
// 				<div style="font-size:12px;color:#6b7280;margin-top:4px">No pending utilization submissions found.</div>
// 			</div>`;
// 			return;
// 		}

// 		// ── FIX ──
// 		// Grouped by partner with real rowspan — Partner Name / Total
// 		// Pending Months / Email / the action button each span every
// 		// budget row for that partner (one merged cell), while Budget
// 		// Reference / Months Pending / Months stay one row per budget.
// 		// This mirrors the requested spreadsheet layout exactly, and the
// 		// export path (_export_pending_util_table) walks these same
// 		// rowspan attributes to produce real merged cells in Excel.
// 		const partners = data
// 			.map(p => ({
// 				partner_id: p.partner_id, partner_name: p.partner_name, email: p.email,
// 				budgets: (p.budgets || []).filter(b => b.missing_months && b.missing_months.length),
// 			}))
// 			.filter(p => p.budgets.length)
// 			.sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || ''));

// 		let rowsHtml = '';
// 		partners.forEach((p, pIdx) => {
// 			const n = p.budgets.length;
// 			const totalPending = p.budgets.reduce((s, b) => s + b.missing_months.length, 0);
// 			const pid = frappe.utils.escape_html(p.partner_id || '');
// 			const pname = frappe.utils.escape_html(p.partner_name || p.partner_id || '—');
// 			const emailHtml = p.email ? frappe.utils.escape_html(p.email) : '<span class="cbd-pu__no-email">No email</span>';

// 			p.budgets.forEach((b, bIdx) => {
// 				const bref = frappe.utils.escape_html(b.budget_reference_name || b.budget_id || '—');
// 				const monthChips = b.missing_months.map(m =>
// 					`<span class="cbd-pu__month-chip" style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca">${frappe.utils.escape_html(m.month)} (${frappe.utils.escape_html(m.financial_year)})</span>`
// 				).join(' ');

// 				rowsHtml += `<tr class="cbd-dt__row" data-partner-idx="${pIdx}">`;
// 				if (bIdx === 0) {
// 					rowsHtml += `
// 						<td class="cbd-dt__num" rowspan="${n}" style="vertical-align:middle">${pIdx + 1}</td>
// 						<td class="cbd-dt__name" rowspan="${n}" style="white-space:normal;min-width:140px;font-weight:700;vertical-align:middle">${pname}</td>`;
// 				}
// 				rowsHtml += `
// 					<td style="white-space:normal;min-width:140px">${bref}</td>
// 					<td style="text-align:center;font-weight:800;color:#dc2626">${b.missing_months.length}</td>
// 					<td style="min-width:260px;max-width:420px">
// 						<div class="cbd-pu__months-cell">${monthChips || '—'}</div>
// 					</td>`;
// 				if (bIdx === 0) {
// 					rowsHtml += `
// 						<td style="text-align:center;font-weight:800;color:#1e3a5f;vertical-align:middle" rowspan="${n}">${totalPending}</td>
// 						<td style="font-size:12px;min-width:180px;white-space:normal;vertical-align:middle" rowspan="${n}">${emailHtml}</td>
// 						<td class="cbd-dt__act" rowspan="${n}" style="vertical-align:middle">
// 							<button class="cbd-dt__btn cbd-pu__send-one" data-pid="${pid}"
// 								${p.email ? '' : 'disabled'}
// 								title="${p.email ? 'Open email reminder for ' + p.partner_name : 'No email on file'}">Send Email</button>
// 						</td>`;
// 				}
// 				rowsHtml += `</tr>`;
// 			});
// 		});

// 		body.innerHTML = `
// 			<table class="cbd-dt cbd-pu__grouped" id="cbd_pu_table">
// 				<thead><tr>
// 					<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 					<th class="cbd-dt__th">Partner Name</th>
// 					<th class="cbd-dt__th">Budget Reference</th>
// 					<th class="cbd-dt__th" style="text-align:center;width:90px">Months Pending</th>
// 					<th class="cbd-dt__th">Months</th>
// 					<th class="cbd-dt__th" style="text-align:center;width:120px">Total Pending Months</th>
// 					<th class="cbd-dt__th">Email</th>
// 					<th class="cbd-dt__th" style="width:100px"></th>
// 				</tr></thead>
// 				<tbody>${rowsHtml}</tbody>
// 			</table>`;

// 		// Grouped/merged tables can't be safely re-sorted or paginated (that
// 		// would reorder or hide rows independently of their rowspan), so
// 		// this table skips both — it stays statically grouped by partner.
// 	}

// 	// ── FIX ──
// 	// No longer sends email through the server. Clicking "Remind" now
// 	// simply opens a mailto: link, which launches the user's own default
// 	// mail client (Outlook, etc.) with the recipient(s), subject, and
// 	// message pre-filled — the user reviews and sends it themselves.
// 	_send_utilisation_reminder(partner_ids, triggerBtn, customMessage) {
// 		if (!partner_ids || !partner_ids.length) return;

// 		const emailMap = {};
// 		(this._pending_util_data || []).forEach(p => { if (p.email) emailMap[p.partner_id] = p.email; });

// 		const emails = [...new Set(partner_ids.map(pid => emailMap[pid]).filter(Boolean))];
// 		if (!emails.length) {
// 			frappe.show_alert({ message: 'No valid email addresses found for the selected partner(s)', indicator: 'red' }, 5);
// 			return;
// 		}

// 		const subject = 'Utilisation Report Submission Reminder';
// 		const defaultBody = 'This is a reminder that your utilisation report submission is pending. Kindly submit it at the earliest to keep your budget records up to date.';
// 		const body = customMessage || defaultBody;

// 		const mailto = `mailto:${emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
// 		window.location.href = mailto;

// 		frappe.show_alert({ message: `Opening your email client for ${emails.length} partner${emails.length === 1 ? '' : 's'}…`, indicator: 'blue' }, 4);
// 	}

// 	// ═══════════════════════════════════════════════════════════════════════
// 	// PARTNERS ≥85% UTILISED MODAL
// 	// Only lists partners who actually meet the threshold (not every
// 	// partner with their percentage) since that's what was asked for.
// 	// ═══════════════════════════════════════════════════════════════════════
// 	_open_partners_80pct_modal() {
// 		const old = document.getElementById('cbd_drill_wrap');
// 		if (old) old.remove();

// 		const partners = this._all_partners || [];
// 		const eligible = partners.filter(p => {
// 			const disb = parseFloat(p.total_disbursement) || 0;
// 			const util = parseFloat(p.total_utilisation) || 0;
// 			return disb > 0 && (util / disb) >= 0.85;
// 		}).map(p => {
// 			const disb = parseFloat(p.total_disbursement) || 0;
// 			const util = parseFloat(p.total_utilisation) || 0;
// 			return { partner_name: p.partner_name, disb, util, pct: disb > 0 ? (util / disb * 100) : 0 };
// 		}).sort((a,b) => b.pct - a.pct);

// 		const wrap = document.createElement('div');
// 		wrap.id = 'cbd_drill_wrap';
// 		wrap.className = 'cbd-dw';
// 		wrap.innerHTML = `
// 			<div class="cbd-dm" id="cbd_dm_box">
// 				<div class="cbd-dm__track cbd-dm__track--2" id="cbd_dm_track" style="width:100%">
// 					<div class="cbd-dm__page cbd-dm__page--2" id="cbd_dm_p1" style="width:100%"></div>
// 				</div>
// 			</div>`;
// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

// 		const box = wrap.querySelector('#cbd_dm_box');
// 		box.addEventListener('click', e => {
// 			if (e.target.closest('.cbd-dm__close')) { this._close_drill_modal_main(); return; }
// 			const expMain = e.target.closest('.cbd-exp-btn--main');
// 			if (expMain) { e.stopPropagation(); expMain.closest('.cbd-exp-dd').classList.toggle('cbd-exp-dd--open'); return; }
// 			const ddItem = e.target.closest('.cbd-exp-dd__item');
// 			if (ddItem) {
// 				e.stopPropagation();
// 				const dd = ddItem.closest('.cbd-exp-dd');
// 				const mainBtn = dd.querySelector('.cbd-exp-btn--main');
// 				dd.classList.remove('cbd-exp-dd--open');
// 				this._export_table(mainBtn.dataset.tbl, mainBtn.dataset.fname, mainBtn.dataset.title, ddItem.dataset.fmt);
// 				return;
// 			}
// 		});
// 		document.addEventListener('click', e => {
// 			if (!e.target.closest('.cbd-exp-dd')) {
// 				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
// 			}
// 		});
// 		wrap.addEventListener('click', e => { if (e.target === wrap) this._close_drill_modal_main(); });
// 		const _esc = e => { if (e.key === 'Escape') this._close_drill_modal_main(); };
// 		document.addEventListener('keydown', _esc);
// 		wrap._esc = _esc;

// 		this._dm_type = 'partners_80pct';

// 		const rows = eligible.map((p, i) => `
// 			<tr class="cbd-dt__row">
// 				<td class="cbd-dt__num">${i + 1}</td>
// 				<td class="cbd-dt__name">${frappe.utils.escape_html(p.partner_name || '—')}</td>
// 				<td class="cbd-dt__r">${this._fmtTip(p.disb,'Disbursed')}</td>
// 				<td class="cbd-dt__r">${this._fmtTip(p.util,'Utilised')}</td>
// 				<td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:#16a34a">${p.pct.toFixed(1)}%</span></td>
// 			</tr>`).join('');

// 		const p1 = document.getElementById('cbd_dm_p1');
// 		p1.innerHTML = `
// 			${this._dm_topbar('Partners with 85%+ Disbursement Utilization', null, null, 1, 'cbd_dm_t80pct', 'Partners_80pct_Disbursement_Utilization')}
// 			<div class="cbd-dm__body">
// 				<div class="cbd-dm__tbl-wrap">
// 					<table class="cbd-dt" id="cbd_dm_t80pct">
// 						<thead><tr>
// 							<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 							<th class="cbd-dt__th">Partner</th>
// 							<th class="cbd-dt__th cbd-dt__th--r">Disbursed</th>
// 							<th class="cbd-dt__th cbd-dt__th--r">Utilised</th>
// 							<th class="cbd-dt__th cbd-dt__th--r">% of Disbursed</th>
// 						</tr></thead>
// 						<tbody>${rows || `<tr><td colspan="5" style="text-align:center;padding:28px;color:#94a3b8">No partners have reached 85% utilisation yet.</td></tr>`}</tbody>
// 					</table>
// 				</div>
// 			</div>`;

// 		setTimeout(() => this._enhance_table('cbd_dm_t80pct'), 50);
// 	}

// 	// ═══════════════════════════════════════════════════════════════════════
// 	// CARD DRILL MODAL
// 	// ═══════════════════════════════════════════════════════════════════════
// 	_open_card_drill_modal(panel) {
// 		// Helper to parse float safely
// 		const _f = v => parseFloat(v) || 0;
// 		// NOTE: All values are RAW (no Math.max clamp) — both card formulas and CFG formulas
// 		// are identical, so drill-down Total row ALWAYS equals card value exactly.
// 		// Negatives are valid: over-utilised partner shows negative expected/gap values.
// 		const CFG = {
// 			bank_balance: {
// 				title:'Reported Bank Balance', col1:'Reported Bank Bal.',
// 				getVal:  p => _f(p.total_bank_balance),
// 				getBVal: b => _f(b.bank_balance),
// 			},
// 			expected_bank_bal: {
// 				// Raw: Disbursement − Utilisation (may be negative for over-utilised partners)
// 				// Sum of raw values = aggregate total = card value
// 				title:'Expected Bank Balance', col1:'Expected Bank Bal. (Disb−Util)',
// 				getVal:  p => _f(p.total_disbursement) - _f(p.total_utilisation),
// 				getBVal: b => _f(b.disbursement)       - _f(b.utilisation),
// 			},
// 			unutilised_disb: {
// 				// Raw: Disbursement − Reported Bank Balance (may be negative if bank > disb)
// 				title:'Expected Bank Balance', col1:'Expected Bank Bal. (Disb−Bank Bal.)',
// 				getVal:  p => _f(p.total_disbursement) - _f(p.total_bank_balance),
// 				getBVal: b => _f(b.disbursement)       - _f(b.bank_balance),
// 			},
// 			bank_bal_gap: {
// 				title:'Bank Balance Difference', col1:'Bank Balance Difference (Expected−Reported)',
// 				getVal:  p => (_f(p.total_disbursement) - _f(p.total_utilisation)) - _f(p.total_bank_balance),
// 				getBVal: b => (_f(b.disbursement)       - _f(b.utilisation))       - _f(b.bank_balance),
// 			},
// 			// ── New analytical cards ─────────────────────────────────────────────
// 			remaining_budget: {
// 				title:'Balance Budget to be Disbursed', col1:'Balance Budget to be Disbursed (Budget − Utilisation)',
// 				getVal:  p => _f(p.total_budget)       - _f(p.total_utilisation),
// 				getBVal: b => _f(b.budget)             - _f(b.utilisation),
// 			},
// 			unspent_disb: {
// 				title:'Expected Bank Balance', col1:'Expected Bank Bal. (Disbursed − Utilised)',
// 				getVal:  p => _f(p.total_disbursement) - _f(p.total_utilisation),
// 				getBVal: b => _f(b.disbursement)       - _f(b.utilisation),
// 			},
// 			bank_variance: {
// 				title:'Bank Balance Difference', col1:'Bank Balance Difference (Expected − Reported)',
// 				getVal:  p => (_f(p.total_disbursement) - _f(p.total_utilisation)) - _f(p.total_bank_balance),
// 				getBVal: b => (_f(b.disbursement)       - _f(b.utilisation))       - _f(b.bank_balance),
// 			},
// 			pending_util: {
// 				title:'Partners – Pending Utilization', col1:'Util %',
// 				getVal:  p => _f(p.utilised_pct),
// 				getBVal: b => _f(b.utilised_pct),
// 				isPct: true,
// 			},
// 		};
// 		const cfg = CFG[panel];
// 		if (!cfg) return;
// 		this._dm_type = panel;

// 		const old = document.getElementById('cbd_drill_wrap');
// 		if (old) old.remove();

// 		const wrap = document.createElement('div');
// 		wrap.id        = 'cbd_drill_wrap';
// 		wrap.className = 'cbd-dw';
// 		wrap.innerHTML = `
// 			<div class="cbd-dm" id="cbd_dm_box">
// 				<div class="cbd-dm__track cbd-dm__track--2" id="cbd_dm_track">
// 					<div class="cbd-dm__page cbd-dm__page--2" id="cbd_dm_p1"></div>
// 					<div class="cbd-dm__page cbd-dm__page--2" id="cbd_dm_p2"></div>
// 				</div>
// 			</div>`;
// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

// 		const box = wrap.querySelector('#cbd_dm_box');
// 		box.addEventListener('click', e => {
// 			if (e.target.closest('.cbd-dm__close'))    { this._close_drill_modal_main(); return; }
// 			const expMain = e.target.closest('.cbd-exp-btn--main');
// 			if (expMain) { e.stopPropagation(); expMain.closest('.cbd-exp-dd').classList.toggle('cbd-exp-dd--open'); return; }
// 			const ddItem = e.target.closest('.cbd-exp-dd__item');
// 			if (ddItem) {
// 				e.stopPropagation();
// 				const dd = ddItem.closest('.cbd-exp-dd');
// 				const mainBtn = dd.querySelector('.cbd-exp-btn--main');
// 				dd.classList.remove('cbd-exp-dd--open');
// 				this._export_table(mainBtn.dataset.tbl, mainBtn.dataset.fname, mainBtn.dataset.title, ddItem.dataset.fmt);
// 				return;
// 			}
// 			if (e.target.closest('#cbd_bc_root') || e.target.closest('#cbd_bc_root_btn')) {
// 				this._dm_page = 1;
// 				const tr = document.getElementById('cbd_dm_track'); if (tr) tr.style.transform='translateX(0)';
// 				return;
// 			}
// 		});
// 		box.addEventListener('input', e => {
// 			const inp = e.target.closest('.cbd-dm__search-input');
// 			if (inp) this._filter_table_rows(inp.dataset.tbl, inp.value);
// 		});
// 		document.addEventListener('click', e => {
// 			if (!e.target.closest('.cbd-exp-dd')) {
// 				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
// 			}
// 		});

// 		wrap.addEventListener('click', e => { if (e.target===wrap) this._close_drill_modal_main(); });
// 		const _esc = e => { if (e.key==='Escape') this._close_drill_modal_main(); };
// 		document.addEventListener('keydown', _esc);
// 		wrap._esc = _esc;

// 		this._dm_page = 1;
// 		const partners = this._all_partners || [];
// 		const table_id  = 'cbd_dm_t1';
// 		const fname     = cfg.title.replace(/\s+/g,'_');

// 		const rows = partners.map((p,idx) => {
// 			const val = cfg.getVal(p);
// 			const disp = cfg.isPct ? `<span class="cbd-dt__pct" style="color:${val<75?'#dc2626':'#16a34a'}">${val.toFixed(1)}%</span>` : this._fmtTip(val, cfg.col1);
// 			return `<tr class="cbd-dt__row" data-pidx="${idx}" style="cursor:pointer" title="Click to view budget details">
// 				<td class="cbd-dt__num">${idx+1}</td>
// 				<td class="cbd-dt__name">${frappe.utils.escape_html(p.partner_name||'—')}</td>
// 				<td class="cbd-dt__r">${disp}</td>
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
// 						</tr></thead>
// 						<tbody>${rows}</tbody>
// 						<tfoot><tr>
// 							<td class="cbd-dt__foot" colspan="2" style="font-weight:700;color:#1e3a5f">Grand Total</td>
// 							<td class="cbd-dt__r cbd-dt__foot" style="font-weight:700;color:${partners.reduce((s,p)=>s+cfg.getVal(p),0)<0?'#dc2626':'#1e3a5f'}">${gt}</td>
// 						</tr></tfoot>
// 					</table>
// 				</div>
// 			</div>`;

// 		setTimeout(() => this._enhance_table(table_id), 50);

// 		p1.addEventListener('click', e => {
// 			const row = e.target.closest('tr.cbd-dt__row[data-pidx]');
// 			if (!row) return;
// 			const partner = (this._all_partners||[])[parseInt(row.dataset.pidx)];
// 			if (!partner) return;
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
// 			const bcR = p2.querySelector('#cbd_bc_root');
// 			if (bcR) bcR.addEventListener('click', () => {
// 				this._dm_page = 1;
// 				const tr = document.getElementById('cbd_dm_track');
// 				if (tr) tr.style.transform = 'translateX(0)';
// 			});
// 			setTimeout(() => this._enhance_table(t2id), 50);
// 		});
// 	}

// 	// ═══════════════════════════════════════════════════════════════════════
// 	// UNIVERSAL DRILL MODAL
// 	// CHANGE #3: Added "Consolidated Line Items" button at partner level
// 	// ═══════════════════════════════════════════════════════════════════════
// 	_open_drill_modal(type) {
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
// 			</div>`;

// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

// 		const box = wrap.querySelector('#cbd_dm_box');
// 		box.addEventListener('click', e => {
// 			if (e.target.closest('.cbd-dm__close')) { this._close_drill_modal_main(); return; }
// 			const expMain = e.target.closest('.cbd-exp-btn--main');
// 			if (expMain) { e.stopPropagation(); expMain.closest('.cbd-exp-dd').classList.toggle('cbd-exp-dd--open'); return; }
// 			const ddItem = e.target.closest('.cbd-exp-dd__item');
// 			if (ddItem) {
// 				e.stopPropagation();
// 				const dd = ddItem.closest('.cbd-exp-dd');
// 				const mainBtn = dd.querySelector('.cbd-exp-btn--main');
// 				dd.classList.remove('cbd-exp-dd--open');
// 				this._export_table(mainBtn.dataset.tbl, mainBtn.dataset.fname, mainBtn.dataset.title, ddItem.dataset.fmt);
// 				return;
// 			}
// 			if (e.target.closest('#cbd_bc_root')) { this._dm_goto(1); return; }
// 			if (e.target.closest('#cbd_bc_p2'))   { this._dm_goto(2); return; }
// 			if (e.target.closest('#cbd_bc_root_btn')) { this._dm_goto(1); return; }
// 			if (e.target.closest('#cbd_bc_p2_btn'))   { this._dm_goto(2); return; }
// 		});
// 		box.addEventListener('input', e => {
// 			const inp = e.target.closest('.cbd-dm__search-input');
// 			if (inp) this._filter_table_rows(inp.dataset.tbl, inp.value);
// 		});
// 		document.addEventListener('click', e => {
// 			if (!e.target.closest('.cbd-exp-dd')) {
// 				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
// 			}
// 		});

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
// 	}

// 	// ─── Page 1: Partners ────────────────────────────────────────────────
// 	// CHANGE #3: Added per-partner "Consolidated Line Items" button
// 	_render_dm_page1() {
// 		const p1   = document.getElementById('cbd_dm_p1');
// 		if (!p1) return;
// 		this._dm_goto(1);

// 		const type     = this._dm_type;
// 		const partners = this._all_partners || [];
// 		const TITLE = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
// 		const showConsolidatedBtn = (type === 'budget' || type === 'utilisation');

// 		const rows = partners.map((p, idx) => {
// 			const bud  = parseFloat(p.total_budget)       || 0;
// 			const util = parseFloat(p.total_utilisation)  || 0;
// 			const disb = parseFloat(p.total_disbursement) || 0;
// 			const pct  = parseFloat(p.utilised_pct)       || 0;
// 			const chip = pct>=75?'#16a34a':'#dc2626';
// 			const pname = frappe.utils.escape_html(p.partner_name||'—');

// 			const budgets = p.budgets || [];
// 			const grantIds  = [...new Set(budgets.map(b=>b.grant_id).filter(Boolean))].join(', ') || '—';
// 			const states    = [...new Set(budgets.map(b=>b.state).filter(Boolean))].join(', ')    || '—';
// 			const districts = [...new Set(budgets.map(b=>b.district).filter(Boolean))].join(', ') || '—';
// 			const blocks    = [...new Set(budgets.map(b=>b.block).filter(Boolean))].join(', ')    || '—';
// 			const approvedCreches = p.total_creches         || 0;

// 			let amtCells = '';
// 			if (type === 'budget') {
// 				amtCells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else if (type === 'utilisation') {
// 				amtCells = `<td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
// 				            <td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else {
// 				const disb_pct = bud>0?(disb/bud*100):0;
// 				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
// 				// Utilisation % here is against the disbursed amount (not
// 				// budget) — that's the meaningful comparison once the money
// 				// has actually reached the partner.
// 				const util_of_disb_pct = disb>0?(util/disb*100):0;
// 				const chip_u = util_of_disb_pct>=75?'#16a34a':'#dc2626';
// 				amtCells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				            <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
// 				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
// 				            <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
// 				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_u}">${util_of_disb_pct.toFixed(1)}%</span></td>`;
// 			}

// 			// Row is fully clickable → navigates to budget level
// 			return `<tr class="cbd-dt__row" data-pidx="${idx}" style="cursor:pointer" title="Click to view budget details">
// 				<td class="cbd-dt__num">${idx+1}</td>
// 				<td class="cbd-dt__name" style="white-space:normal;min-width:130px">${pname}</td>
// 				<td style="font-size:11px;white-space:normal;min-width:90px">${frappe.utils.escape_html(grantIds)}</td>
// 				<td style="font-size:11px;white-space:normal;min-width:80px">${frappe.utils.escape_html(states)}</td>
// 				<td style="font-size:11px;white-space:normal;min-width:80px">${frappe.utils.escape_html(districts)}</td>
// 				<td style="font-size:11px;white-space:normal;min-width:70px">${frappe.utils.escape_html(blocks)}</td>
// 				<td class="cbd-dt__r" style="min-width:60px">${approvedCreches.toLocaleString('en-IN')}</td>
// 				${amtCells}

// 			</tr>`;
// 		}).join('');

// 		const gt_bud  = partners.reduce((s,p)=>s+(parseFloat(p.total_budget)||0),0);
// 		const gt_util = partners.reduce((s,p)=>s+(parseFloat(p.total_utilisation)||0),0);
// 		const gt_disb = partners.reduce((s,p)=>s+(parseFloat(p.total_disbursement)||0),0);
// 		const gt_appr = partners.reduce((s,p)=>s+(p.total_creches||0),0);
// 		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
// 		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
// 		const gt_util_of_disb_pct = gt_disb>0?(gt_util/gt_disb*100):0;
// 		let foot_cells = '';
// 		if (type==='budget')
// 			foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else if (type==='utilisation')
// 			foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else
// 			foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_util_of_disb_pct.toFixed(1)}%</td>`;

// 		let amtHeaders = '';
// 		if (type==='budget')
// 			amtHeaders = '<th class="cbd-dt__th cbd-dt__th--r">Budget</th><th class="cbd-dt__th cbd-dt__th--r">Util %</th>';
// 		else if (type==='utilisation')
// 			amtHeaders = '<th class="cbd-dt__th cbd-dt__th--r">Utilisation</th><th class="cbd-dt__th cbd-dt__th--r">Budget</th><th class="cbd-dt__th cbd-dt__th--r">Util %</th>';
// 		else
// 			amtHeaders = '<th class="cbd-dt__th cbd-dt__th--r">Budget</th><th class="cbd-dt__th cbd-dt__th--r">Disbursed</th><th class="cbd-dt__th cbd-dt__th--r">Disb %</th><th class="cbd-dt__th cbd-dt__th--r">Utilised</th><th class="cbd-dt__th cbd-dt__th--r">Util %</th>';


// 		const table_id  = 'cbd_dm_t1';
// 		const fname     = (TITLE[type] || type).replace(/\s+/g,'_');

// 		p1.innerHTML = `
// 			${this._dm_topbar(TITLE[type], null, null, 1, table_id, fname)}
// 			<div class="cbd-dm__body">
// 				<div class="cbd-dm__tbl-wrap">
// 					<table class="cbd-dt" id="${table_id}" style="table-layout:auto">
// 						<thead><tr>
// 							<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 							<th class="cbd-dt__th">Partner</th>
// 							<th class="cbd-dt__th">Grant ID(s)</th>
// 							<th class="cbd-dt__th">States</th>
// 							<th class="cbd-dt__th">Districts</th>
// 							<th class="cbd-dt__th">Blocks</th>
// 							<th class="cbd-dt__th cbd-dt__th--r">Approved Creches</th>
// 							${amtHeaders}

// 						</tr></thead>
// 						<tbody>${rows}</tbody>
// 						<tfoot><tr>
// 							<td class="cbd-dt__foot" colspan="6" style="font-weight:800">Grand Total</td>
// 							<td class="cbd-dt__r cbd-dt__foot">${gt_appr.toLocaleString('en-IN')}</td>
// 							${foot_cells}
// 						</tr></tfoot>
// 					</table>
// 				</div>
// 			</div>`;

// 		setTimeout(() => this._enhance_table(table_id), 50);

// 		// ROW CLICK: clicking any row navigates to budget level (page 2)
// 		p1.addEventListener('click', e => {
// 			const row = e.target.closest('tr.cbd-dt__row[data-pidx]');
// 			if (!row) return;
// 			const idx = parseInt(row.dataset.pidx);
// 			this._dm_partner = (this._all_partners||[])[idx];
// 			if (this._dm_partner) this._render_dm_page2();
// 		});
// 	}

// 			// ─── Page 2: Budget rows ────────────────────────────────────────────
// 	// silent=true: render page 2 content without animating to it (for back-nav from page 3)
// 	_render_dm_page2(silent = false) {
// 		const p2      = document.getElementById('cbd_dm_p2');
// 		if (!p2) return;
// 		if (!silent) this._dm_goto(2);

// 		const type    = this._dm_type;
// 		const partner = this._dm_partner;
// 		const budgets = partner.budgets || [];
// 		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
// 		const TITLE   = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
// 		const COLS    = {
// 			budget:       ['Budget Reference', 'Grant ID', 'Start Date', 'End Date', 'Budget', 'Util %'],
// 			utilisation:  ['Budget Reference', 'Grant ID', 'Start Date', 'End Date', 'Utilisation', 'Budget', 'Util %'],
// 			disbursement: ['Budget Reference', 'Grant ID', 'Start Date', 'End Date', 'Budget', 'Disbursed', 'Disb %', 'Utilised', 'Util %'],
// 		};

// 		const rows = budgets.map((b, i) => {
// 			const bud  = parseFloat(b.budget)       || 0;
// 			const util = parseFloat(b.utilisation)  || 0;
// 			const disb = parseFloat(b.disbursement) || 0;
// 			const pct  = parseFloat(b.utilised_pct) || 0;
// 			const chip = pct>=75?'#16a34a':'#dc2626';
// 			let cells = '';
// 			const dateCells = `<td style="white-space:nowrap;font-size:12px">${this._date(b.grant_start)||'—'}</td>
// 			                    <td style="white-space:nowrap;font-size:12px">${this._date(b.grant_end)||'—'}</td>`;
// 			if (type === 'budget') {
// 				cells = `${dateCells}<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else if (type === 'utilisation') {
// 				cells = `${dateCells}<td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
// 				         <td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else {
// 				const disb_pct = bud>0?(disb/bud*100):0;
// 				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
// 				const util_of_disb_pct = disb>0?(util/disb*100):0;
// 				const chip_u = util_of_disb_pct>=75?'#16a34a':'#dc2626';
// 				cells = `${dateCells}<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
// 				         <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_u}">${util_of_disb_pct.toFixed(1)}%</span></td>`;
// 			}
// 			return `<tr class="cbd-dt__row" data-bidx="${i}" style="cursor:pointer" title="Click to view line items">
// 				<td class="cbd-dt__num">${i+1}</td>
// 				<td class="cbd-dt__name">
// 					<div style="font-weight:600;color:#111827">${frappe.utils.escape_html(b.budget_reference_name||'—')}</div>
// 					${b.state?`<div style="font-size:11px;color:#9ca3af">${frappe.utils.escape_html(b.state)}</div>`:''}
// 				</td>
// 				<td>${frappe.utils.escape_html(b.grant_id||'—')}</td>
// 				${cells}

// 			</tr>`;
// 		}).join('');

// 		const gt_bud  = budgets.reduce((s,b)=>s+(parseFloat(b.budget)||0),0);
// 		const gt_util = budgets.reduce((s,b)=>s+(parseFloat(b.utilisation)||0),0);
// 		const gt_disb = budgets.reduce((s,b)=>s+(parseFloat(b.disbursement)||0),0);
// 		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
// 		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
// 		const gt_util_of_disb_pct = gt_disb>0?(gt_util/gt_disb*100):0;
// 		let foot_cells = '';
// 		if (type==='budget')           foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else if (type==='utilisation') foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_util_of_disb_pct.toFixed(1)}%</td>`;

// 		const thead_html = COLS[type].map(h=>`<th class="cbd-dt__th">${h}</th>`).join('');
// 		const table_id   = 'cbd_dm_t2';
// 		const fname      = `${TITLE[type].replace(/\s+/g,'_')}_${pname.replace(/\s+/g,'_')}`;

// 		const showConsolidated = (type === 'budget' || type === 'utilisation'); // always show at budget level
// 		const consolidatedBtnHtml = showConsolidated ? `
// 			<button class="cbd-dt__btn cbd-dm__consolidated-btn" id="cbd_dm_consolidated" style="margin-bottom:10px">
// 				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
// 				View Consolidated Line Items (${budgets.length} budgets)
// 			</button>` : '';

// 		p2.innerHTML = `
// 			${this._dm_topbar(TITLE[type], pname, null, 2, table_id, fname)}
// 			<div class="cbd-dm__body">
// 				<div class="cbd-dm__tbl-wrap">
// 					${consolidatedBtnHtml}
// 					<table class="cbd-dt" id="${table_id}">
// 						<thead><tr>
// 							<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 							${thead_html}

// 						</tr></thead>
// 						<tbody>${rows}</tbody>
// 						<tfoot><tr>
// 							<td class="cbd-dt__foot">&nbsp;</td>
// 							<td class="cbd-dt__foot" style="font-weight:800" colspan="4">Total</td>
// 							${foot_cells}
// 						</tr></tfoot>
// 					</table>
// 				</div>
// 			</div>`;

// 		setTimeout(() => this._enhance_table(table_id), 50);

// 		p2.addEventListener('click', e => {
// 			// Consolidated button
// 			const consolidatedBtn = e.target.closest('#cbd_dm_consolidated');
// 			if (consolidatedBtn) {
// 				e.stopPropagation();
// 				this._dm_budget = null;
// 				this._render_dm_page3(true);
// 				return;
// 			}
// 			// Row click → line items
// 			const row = e.target.closest('tr.cbd-dt__row[data-bidx]');
// 			if (!row) return;
// 			const bidx = parseInt(row.dataset.bidx);
// 			this._dm_budget = (partner.budgets||[])[bidx];
// 			if (this._dm_budget) this._render_dm_page3();
// 		});
// 	}

// 	// ─── Page 3: Line Items ─────────────────────────────────────────────
// 	_render_dm_page3(consolidated) {
// 		const p3    = document.getElementById('cbd_dm_p3');
// 		if (!p3) return;
// 		this._dm_goto(3);

// 		const type    = this._dm_type;
// 		const partner = this._dm_partner;
// 		const budget  = this._dm_budget;
// 		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
// 		const TITLE   = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };

// 		const bname   = consolidated
// 			? `Consolidated (${(partner.budgets||[]).length} budgets)`
// 			: frappe.utils.escape_html(budget.budget_reference_name||'Budget');
// 		const fname   = `${TITLE[type].replace(/\s+/g,'_')}_${(consolidated?'Consolidated':bname).replace(/\s+/g,'_')}_${pname.replace(/\s+/g,'_')}`;

// 		p3.innerHTML = `
// 			${this._dm_topbar(TITLE[type], pname, bname, 3, 'cbd_dm_t3', fname)}
// 			<div class="cbd-dm__body" id="cbd_dm_p3_body">
// 				<div class="cbd-dm__loading">Loading line items…</div>
// 			</div>`;

// 		const pf = this._panel_filters();
// 		const callArgs = (budget_id) => ({
// 			budget_id, start_date: pf.start_date||null, end_date: pf.end_date||null,
// 			financial_year: pf.financial_year ? JSON.stringify(pf.financial_year) : null,
// 			month: pf.month ? JSON.stringify(pf.month) : null,
// 		});

// 		if (type === 'disbursement') {
// 			// Disbursement view is unchanged — not part of the month-wise redesign.
// 			const budget_id = consolidated ? null : budget.budget_id;
// 			const budgetIds = consolidated ? (partner.budgets||[]).map(b=>b.budget_id).filter(Boolean) : [budget_id];
// 			frappe.call({
// 				method: 'creche_reports.api.creche_dashboard.get_disbursement_panel_data',
// 				args: {budget_ids: JSON.stringify(budgetIds), partner_ids: null,
// 				       start_date: pf.start_date||null, end_date: pf.end_date||null,
// 				       financial_year: pf.financial_year ? JSON.stringify(pf.financial_year) : null,
// 				       month: pf.month ? JSON.stringify(pf.month) : null},
// 				callback: r => this._render_dm_disb_items(r.message||[]),
// 			});
// 			return;
// 		}

// 		const method = type === 'budget'
// 			? 'get_budget_line_items'
// 			: 'get_utilisation_line_items';

// 		if (consolidated) {
// 			const budgetIds = (partner.budgets || []).map(b => b.budget_id).filter(Boolean);
// 			Promise.all(budgetIds.map(budget_id => frappe.call({
// 				method: `creche_reports.api.creche_dashboard.${method}`,
// 				args: callArgs(budget_id),
// 			}))).then(responses => {
// 				const datasets = responses.map(r => r.message || {months:[], rows:[]});
// 				const merged = this._merge_monthly_datasets(datasets);
// 				if (type === 'budget') this._render_dm_budget_items(merged, true);
// 				else this._render_dm_util_items(merged, true);
// 			});
// 			return;
// 		}

// 		frappe.call({
// 			method: `creche_reports.api.creche_dashboard.${method}`,
// 			args: callArgs(budget.budget_id),
// 			callback: r => {
// 				const data = r.message || {months: [], rows: []};
// 				if (type === 'budget') this._render_dm_budget_items(data);
// 				else this._render_dm_util_items(data);
// 			},
// 		});
// 	}

// 	// Union month columns and sum matching rows (by expense type + sub
// 	// head + main head) across several budgets' {months, rows} datasets.
// 	// Used for the "Consolidated Line Items" view across all of a
// 	// partner's budgets.
// 	_merge_monthly_datasets(datasets) {
// 		const MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// 		const monthVal = (label) => {
// 			const parts = label.split(' ');
// 			const mi = MON3.indexOf(parts[0]);
// 			const yr = parseInt(parts[1], 10) || 0;
// 			return yr * 12 + (mi >= 0 ? mi : 0);
// 		};

// 		const allMonths = [];
// 		datasets.forEach(d => (d.months || []).forEach(m => { if (!allMonths.includes(m)) allMonths.push(m); }));
// 		allMonths.sort((a, b) => monthVal(a) - monthVal(b));

// 		const merged = {};
// 		const order = [];
// 		datasets.forEach(d => (d.rows || []).forEach(r => {
// 			const key = [r.type_of_expenses||'—', r.budget_sub_head||'—', r.budget_main_head||'—'].join('||');
// 			if (!merged[key]) {
// 				merged[key] = {
// 					type_of_expenses: r.type_of_expenses, budget_sub_head: r.budget_sub_head,
// 					budget_main_head: r.budget_main_head, monthly: {}, total: 0,
// 				};
// 				order.push(key);
// 			}
// 			Object.entries(r.monthly || {}).forEach(([label, v]) => {
// 				merged[key].monthly[label] = (merged[key].monthly[label] || 0) + (parseFloat(v) || 0);
// 			});
// 			merged[key].total += parseFloat(r.total) || 0;
// 		}));

// 		return { months: allMonths, rows: order.map(k => merged[k]) };
// 	}

// 	_render_dm_budget_items(data, consolidated) {
// 		const body = document.getElementById('cbd_dm_p3_body');
// 		if (!body) return;
// 		body.classList.add('cbd-li-scrollbody');

// 		const months = data.months || [];
// 		const items  = data.rows || [];
// 		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No budget line items found.</div>'; return; }

// 		const grand = items.reduce((s,r)=>s+(parseFloat(r.total)||0),0);
// 		const monthTotals = months.map(m => items.reduce((s,r)=>s+(parseFloat((r.monthly||{})[m])||0),0));

// 		const monthThs   = months.map(m => `<th class="cbd-dt__th cbd-dt__th--r cbd-li__month-col">${frappe.utils.escape_html(m)}</th>`).join('');
// 		const monthFoots = monthTotals.map(v => `<td class="cbd-dt__r cbd-dt__foot cbd-li__month-col">${this._fmtTip(v, 'Month Total')}</td>`).join('');

// 		// colCount = # + ExpType + SubHead + one column per month + Total
// 		const colCount = 3 + months.length + 1;
// 		const rowHtmlFn = (r, i) => {
// 			const monthTds = months.map(m => {
// 				const v = (r.monthly||{})[m];
// 				return `<td class="cbd-dt__r cbd-li__month-col">${v ? this._fmtTip(v, m) : '—'}</td>`;
// 			}).join('');
// 			return `
// 			<tr class="cbd-dt__row cbd-grp__child-row">
// 				<td class="cbd-dt__num cbd-dt__indent-num cbd-li__sticky-num">${i+1}</td>
// 				<td class="cbd-dt__cell-indent cbd-li__sticky-exp">${frappe.utils.escape_html(r.type_of_expenses||'—')}</td>
// 				<td>${frappe.utils.escape_html(r.budget_sub_head||'—')}</td>
// 				${monthTds}
// 				<td class="cbd-dt__r" style="font-weight:800">${this._fmtTip(r.total,'Total')}</td>
// 			</tr>`;
// 		};
// 		const groupedHtml = this._render_main_head_groups(items, rowHtmlFn, r => parseFloat(r.total)||0, colCount, 'Total', false);

// 		body.innerHTML = `
// 			<div class="cbd-li__expand-bar">
// 				<span class="cbd-li__expand-hint">${items.length} line item${items.length===1?'':'s'} · ${months.length} month${months.length===1?'':'s'} (${months[0]||''}${months.length>1?' – '+months[months.length-1]:''})</span>
// 				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__months-chk" checked> Show months</label>
// 				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__items-chk" checked> Show line items</label>
// 			</div>
// 			<div class="cbd-dm__tbl-wrap">
// 				<table class="cbd-dt cbd-dt--grouped" id="cbd_dm_t3">
// 					<thead><tr>
// 						<th class="cbd-dt__th cbd-dt__th--num cbd-li__sticky-num">#</th>
// 						<th class="cbd-dt__th cbd-li__sticky-exp">Expense Type</th>
// 						<th class="cbd-dt__th">Sub Head</th>
// 						${monthThs}
// 						<th class="cbd-dt__th cbd-dt__th--r">Total</th>
// 					</tr></thead>
// 					<tbody>${groupedHtml}</tbody>
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot cbd-li__sticky-num" colspan="3" style="font-weight:800">Total</td>
// 						${monthFoots}
// 						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand,'Grand Total')}</td>
// 					</tr></tfoot>
// 				</table>
// 			</div>`;

// 		this._make_table_sortable('cbd_dm_t3');
// 		this._sync_li_header_offset('cbd_dm_t3');
// 		this._wire_li_expand_checkboxes('cbd_dm_t3');
// 	}

// 	_render_main_head_groups(items, rowHtmlFn, amtGetter, colCount, amtLabel, showYears) {
// 		// ── FIX #1 ──
// 		// Previously this used a plain JS object ({}) keyed by the raw
// 		// budget_main_head string. That's fragile: any invisible
// 		// whitespace difference, or a value that happens to collide with
// 		// something on Object.prototype, can cause an entire category's
// 		// rows to be silently swallowed — they still get counted in the
// 		// "N line items" total (which counts the flat `items` array
// 		// directly) but never get a group header rendered, so the whole
// 		// category vanishes from the table with no error.
// 		//
// 		// Using a Map avoids any object-key ambiguity entirely, and
// 		// trimming/normalizing the key means differences in surrounding
// 		// whitespace can no longer split (or hide) a category.
// 		const groups = new Map();
// 		items.forEach(r => {
// 			const raw = r.budget_main_head;
// 			const key = (raw === null || raw === undefined || String(raw).trim() === '')
// 				? '—'
// 				: String(raw).trim();
// 			if (!groups.has(key)) groups.set(key, []);
// 			groups.get(key).push(r);
// 		});

// 		// Deterministic alphabetical order (case-insensitive); unlabeled
// 		// items always sort last so they don't visually hide as "first".
// 		const order = [...groups.keys()].sort((a, b) => {
// 			if (a === '—') return 1;
// 			if (b === '—') return -1;
// 			return a.localeCompare(b, undefined, { sensitivity: 'base' });
// 		});

// 		let html = '';
// 		let groupIdx = 0;
// 		order.forEach(mainHead => {
// 			const groupRows = groups.get(mainHead);
// 			const groupTotal = groupRows.reduce((s, r) => s + amtGetter(r), 0);
// 			const gid = `cbd_grp_${groupIdx++}_${Math.random().toString(36).slice(2,7)}`;
// 			// Section divider row — click to expand/collapse just this group.
// 			html += `
// 			<tr class="cbd-grp__header-row" data-grp-target="${gid}" title="Click to expand/collapse">
// 				<td colspan="${colCount}">
// 					<div class="cbd-grp__header">
// 						<svg class="cbd-grp__chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
// 						<span class="cbd-grp__title">${frappe.utils.escape_html(mainHead)}</span>
// 						<span class="cbd-grp__count">${groupRows.length} item${groupRows.length===1?'':'s'}</span>
// 						<span class="cbd-grp__subtotal">${this._fmtTip(groupTotal, `${mainHead} — ${amtLabel}`)}</span>
// 					</div>
// 				</td>
// 			</tr>`;
// 			groupRows.forEach((r, i) => {
// 				html += rowHtmlFn(r, i).replace('<tr class="cbd-dt__row cbd-grp__child-row">', `<tr class="cbd-dt__row cbd-grp__child-row" data-grp-parent="${gid}">`);
// 			});
// 		});

// 		// Safety net: if this ever mismatches again for any reason, it
// 		// will show up loudly in the console instead of silently
// 		// dropping rows.
// 		const groupedCount = order.reduce((s, k) => s + groups.get(k).length, 0);
// 		if (groupedCount !== items.length) {
// 			console.warn(`[Creche Dashboard] Line item grouping mismatch: ${items.length} items in, ${groupedCount} items grouped.`);
// 		}

// 		return html;
// 	}

// 	_render_dm_util_items(data, consolidated) {
// 		const body = document.getElementById('cbd_dm_p3_body');
// 		if (!body) return;
// 		body.classList.add('cbd-li-scrollbody');

// 		const months = data.months || [];
// 		const items  = data.rows || [];
// 		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No utilisation line items found.</div>'; return; }

// 		const grand = items.reduce((s,r)=>s+(parseFloat(r.total)||0),0);
// 		const monthTotals = months.map(m => items.reduce((s,r)=>s+(parseFloat((r.monthly||{})[m])||0),0));

// 		const monthThs   = months.map(m => `<th class="cbd-dt__th cbd-dt__th--r cbd-li__month-col">${frappe.utils.escape_html(m)}</th>`).join('');
// 		const monthFoots = monthTotals.map(v => `<td class="cbd-dt__r cbd-dt__foot cbd-li__month-col">${this._fmtTip(v, 'Month Total')}</td>`).join('');

// 		const colCount = 3 + months.length + 1;
// 		const rowHtmlFn = (r, i) => {
// 			const monthTds = months.map(m => {
// 				const v = (r.monthly||{})[m];
// 				return `<td class="cbd-dt__r cbd-li__month-col">${v ? this._fmtTip(v, m) : '—'}</td>`;
// 			}).join('');
// 			return `<tr class="cbd-dt__row cbd-grp__child-row">
// 				<td class="cbd-dt__num cbd-dt__indent-num cbd-li__sticky-num">${i+1}</td>
// 				<td class="cbd-dt__cell-indent cbd-li__sticky-exp">${frappe.utils.escape_html(r.type_of_expenses||'—')}</td>
// 				<td>${frappe.utils.escape_html(r.budget_sub_head||'—')}</td>
// 				${monthTds}
// 				<td class="cbd-dt__r" style="font-weight:800">${this._fmtTip(r.total,'Total')}</td>
// 			</tr>`;
// 		};
// 		const groupedHtml = this._render_main_head_groups(items, rowHtmlFn, r => parseFloat(r.total)||0, colCount, 'Total', false);

// 		body.innerHTML = `
// 			<div class="cbd-li__expand-bar">
// 				<span class="cbd-li__expand-hint">${items.length} line item${items.length===1?'':'s'} · ${months.length} month${months.length===1?'':'s'} (${months[0]||''}${months.length>1?' – '+months[months.length-1]:''})</span>
// 				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__months-chk" checked> Show months</label>
// 				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__items-chk" checked> Show line items</label>
// 			</div>
// 			<div class="cbd-dm__tbl-wrap">
// 				<table class="cbd-dt cbd-dt--grouped" id="cbd_dm_t3">
// 					<thead><tr>
// 						<th class="cbd-dt__th cbd-dt__th--num cbd-li__sticky-num">#</th>
// 						<th class="cbd-dt__th cbd-li__sticky-exp">Expense Type</th>
// 						<th class="cbd-dt__th">Sub Head</th>
// 						${monthThs}
// 						<th class="cbd-dt__th cbd-dt__th--r">Total</th>
// 					</tr></thead>
// 					<tbody>${groupedHtml}</tbody>
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot cbd-li__sticky-num" colspan="3" style="font-weight:800">Total</td>
// 						${monthFoots}
// 						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand,'Grand Total')}</td>
// 					</tr></tfoot>
// 				</table>
// 			</div>`;

// 		this._make_table_sortable('cbd_dm_t3');
// 		this._sync_li_header_offset('cbd_dm_t3');
// 		this._wire_li_expand_checkboxes('cbd_dm_t3');
// 	}

// 	_render_dm_disb_items(records) {
// 		const body = document.getElementById('cbd_dm_p3_body');
// 		if (!body) return;
// 		body.classList.add('cbd-li-scrollbody');
// 		const entries = [];
// 		(records||[]).forEach(d => {
// 			const ref = d.budget_reference_name || '—';
// 			const tracker = d.tracker || [];
// 			if (tracker.length) {
// 				tracker.forEach(t => {
// 					entries.push({ date: t.date_of_disbursement || '', amount: t.disbursed_amount || 0, ref });
// 				});
// 			} else if (parseFloat(d.total_disbursement)) {
// 				entries.push({ date: '', amount: d.total_disbursement, ref });
// 			}
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
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot" colspan="3" style="font-weight:800">Total</td>
// 						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand)}</td>
// 					</tr></tfoot>
// 				</table>
// 			</div>`;

// 		setTimeout(() => this._enhance_table('cbd_dm_t3'), 50);
// 	}

// 	// ─── Topbar ──────────────────────────────────────────────────────────
// 	_dm_breadcrumb_names() {
// 		const type = this._dm_type || 'budget';
// 		const MAP = {
// 			budget:              { p1:'Partner Level',         p2:'Budget Level',          p3:'Expense Items Level'   },
// 			utilisation:         { p1:'Partner Level',         p2:'Budget Level',          p3:'Expense Items Level'   },
// 			disbursement:        { p1:'Partner Level',         p2:'Budget Level',          p3:'Expense Items Level'   },
// 			bank_balance:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			expected_bank_bal:   { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			unutilised_disb:     { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			bank_bal_gap:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			remaining_budget:    { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			unspent_disb:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			bank_variance:       { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			pending_util:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
// 			partners_80pct:      { p1:'Partners with 85%+ Disbursement Utilization', p2:null,                   p3:null                    },
// 		};
// 		return MAP[type] || { p1:'Partner Level', p2:'Budget Level', p3:'Expense Items Level' };
// 	}

// 	_dm_topbar(title, p2label, p3label, page, tableId, fname) {
// 		const N = this._dm_breadcrumb_names();

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

// 		return `
// 			<div class="cbd-dm__topbar">
// 				<div class="cbd-dm__topbar-left">
// 					${backBtn}
// 					<nav class="cbd-bc">${bc1}${bc2}${bc3}</nav>
// 				</div>
// 				<div class="cbd-dm__actions">
// 					<div class="cbd-dm__search">
// 						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
// 						<input type="text" class="cbd-dm__search-input" data-tbl="${tableId}" placeholder="Search...">
// 					</div>
// 					<div class="cbd-exp-dd">
// 						<button class="cbd-exp-btn cbd-exp-btn--main" data-tbl="${tableId}" data-fname="${frappe.utils.escape_html(fname)}" data-title="${frappe.utils.escape_html(title||fname)}">
// 							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
// 							Export
// 							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
// 						</button>
// 						<div class="cbd-exp-dd__menu">
// 							<button class="cbd-exp-dd__item" data-fmt="xlsx">
// 								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
// 								Excel (.xlsx)
// 							</button>
// 							<button class="cbd-exp-dd__item" data-fmt="pdf">
// 								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
// 								PDF (A4)
// 							</button>
// 						</div>
// 					</div>
// 					<button class="cbd-dm__close" title="Close (Esc)">
// 						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 					</button>
// 				</div>
// 			</div>`;
// 	}

// 	// ─── Export ──────────────────────────────────────────────────────────
// 	// CHANGE #9: export strips group-band rows and handles indent properly
// 	// Walks the DOM's actual rowspan attributes to reconstruct a proper
// 	// grid (with merge ranges) so the exported Excel file has the same
// 	// merged Partner Name / Total Pending Months / Email cells as the
// 	// on-screen table, instead of flattening/repeating those values.
// 	_export_pending_util_table(format) {
// 		const table = document.getElementById('cbd_pu_table');
// 		if (!table) { frappe.show_alert({message:'Table not ready', indicator:'orange'}); return; }

// 		const theadRow = table.querySelector('thead tr');
// 		const ths = [...theadRow.querySelectorAll('th')];
// 		// Drop the trailing action column (Send Email button) — not exportable data
// 		const columns = ths.slice(0, -1).map(th => ({ label: (th.innerText || th.textContent || '').trim() }));
// 		const numDataCols = columns.length;

// 		const bodyRows = [...table.querySelectorAll('tbody tr')];
// 		const grid = [];
// 		const merges = [];
// 		const carry = {}; // colIdx -> { remaining, value }

// 		bodyRows.forEach((tr, rIdx) => {
// 			const cells = [...tr.children];
// 			let cellPtr = 0;
// 			const rowVals = [];
// 			let colIdx = 0;
// 			while (colIdx < numDataCols) {
// 				if (carry[colIdx] && carry[colIdx].remaining > 0) {
// 					rowVals[colIdx] = '';
// 					carry[colIdx].remaining--;
// 					colIdx++;
// 					continue;
// 				}
// 				const td = cells[cellPtr++];
// 				if (!td) break;
// 				const rowspan = parseInt(td.getAttribute('rowspan') || '1');
// 				const val = (td.innerText || td.textContent || '').replace(/\s+/g, ' ').trim();
// 				rowVals[colIdx] = val;
// 				if (rowspan > 1) {
// 					merges.push([rIdx, colIdx, rIdx + rowspan - 1, colIdx]);
// 					carry[colIdx] = { remaining: rowspan - 1, value: val };
// 				}
// 				colIdx++;
// 			}
// 			grid.push(rowVals);
// 		});

// 		if (format === 'pdf') {
// 			// PDF layout doesn't preserve cell merges the same way — fall back
// 			// to the flattened (repeated-value) rows via the generic exporter
// 			// so the data itself is still complete and correct.
// 			const rows = grid.map(rowVals => {
// 				const row = {};
// 				columns.forEach((c, i) => { row['c'+i] = rowVals[i] ?? ''; });
// 				return row;
// 			});
// 			const cols = columns.map((c, i) => ({ label: c.label, key: 'c'+i, align: 'left' }));
// 			frappe.show_alert({message:'Generating PDF…', indicator:'blue'}, 2);
// 			frappe.call({
// 				method: 'creche_reports.api.creche_dashboard.export_table',
// 				args: { title: 'Pending Utilization Submission', columns: JSON.stringify(cols), rows: JSON.stringify(rows), format: 'pdf' },
// 				callback: (r) => {
// 					if (r.message && r.message.file_url) { window.open(r.message.file_url, '_blank'); frappe.show_alert({message:'Download ready', indicator:'green'}, 3); }
// 					else frappe.show_alert({message:'Export failed', indicator:'red'});
// 				},
// 			});
// 			return;
// 		}

// 		frappe.show_alert({message:'Generating XLSX…', indicator:'blue'}, 2);
// 		frappe.call({
// 			method: 'creche_reports.api.creche_dashboard.export_pending_utilisation_grid',
// 			args: {
// 				title: 'Pending Utilization Submission',
// 				columns: JSON.stringify(columns),
// 				grid: JSON.stringify(grid),
// 				merges: JSON.stringify(merges),
// 			},
// 			callback: (r) => {
// 				if (r.message && r.message.file_url) { window.open(r.message.file_url, '_blank'); frappe.show_alert({message:'Download ready', indicator:'green'}, 3); }
// 				else frappe.show_alert({message:'Export failed', indicator:'red'});
// 			},
// 		});
// 	}

// 	_table_to_columns_rows(tableId) {
// 		const table = document.getElementById(tableId);
// 		if (!table) return null;
// 		const clone = table.cloneNode(true);
// 		// Reset pagination: make ALL rows visible in clone so export captures full dataset
// 		clone.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
// 			if (tr.getAttribute('data-search-hidden') !== '1') tr.style.display = '';
// 		});
// 		clone.querySelectorAll('td.cbd-dt__act, .cbd-dt__btn, button').forEach(el => {
// 			const td = el.closest('td,th'); if (td) td.remove();
// 		});
// 		const theadRow = clone.querySelector('thead tr');
// 		if (!theadRow) return null;
// 		const ths = [...theadRow.querySelectorAll('th')];
// 		const _cleanLabel = (s) =>
// 			(s || '').trim()
// 				.replace(/[\u2191\u2193\u2195\u21C5\u2B06\u2B07\u21D1\u21D3\u21D5\u21D5⇅↕↑↓\u2912\u2913]+/g, '')
// 				.trim();
// 		const columns = ths.map((th, i) => ({
// 			label: _cleanLabel(th.innerText || th.textContent || ''),
// 			key: 'c' + i,
// 			align: th.classList.contains('cbd-dt__th--r') ? 'right' : 'left',
// 		}));

// 		// Helper: extract the best value from a <td>.
// 		// Priority: data-raw attribute on a child span (exact number) > text parsing
// 		const _cellValue = (td) => {
// 			// Check for data-raw (set by _fmtTip) — gives the exact number without Cr/L/K
// 			const rawEl = td.querySelector('[data-raw]');
// 			if (rawEl) {
// 				const raw = parseFloat(rawEl.dataset.raw);
// 				if (!isNaN(raw)) return Math.round(raw * 100) / 100; // 2 decimal places
// 			}
// 			// Fallback: parse text
// 			const txt = (td.innerText || td.textContent || '').replace(/\n/g, ' ').trim();
// 			if (!txt || txt === '—') return txt;
// 			const num = parseFloat(txt.replace(/[₹,\s%]/g, ''));
// 			return (!isNaN(num) && /[\d]/.test(txt)) ? num : txt;
// 		};

// 		const rows = [];

// 		// Group header rows → export as __group__ band row with raw subtotal
// 		clone.querySelectorAll('tbody tr').forEach(tr => {
// 			if (tr.style.display === 'none') return;

// 			if (tr.classList.contains('cbd-grp__header-row')) {
// 				const titleEl = tr.querySelector('.cbd-grp__title');
// 				const subEl   = tr.querySelector('.cbd-grp__subtotal');
// 				const label   = titleEl ? (titleEl.innerText || titleEl.textContent || '').trim() : '';
// 				// Use raw number from subtotal span if available, else text
// 				let subtotal;
// 				if (subEl) {
// 					const rawEl = subEl.querySelector('[data-raw]');
// 					subtotal = rawEl ? (parseFloat(rawEl.dataset.raw) || '') : (subEl.innerText || subEl.textContent || '').trim();
// 				} else { subtotal = ''; }
// 				rows.push({ __group__: true, label, subtotal });
// 				return;
// 			}

// 			// Use colspan-aware indexing so <td colspan="N"> doesn't shift later cells left
// 			const tds = [...tr.querySelectorAll('td')];
// 			const row = {};
// 			let colIdx = 0;
// 			tds.forEach(td => {
// 				const span = parseInt(td.getAttribute('colspan') || '1');
// 				row[columns[colIdx] ? columns[colIdx].key : ('c'+colIdx)] = _cellValue(td);
// 				colIdx += span; // advance past all spanned columns
// 			});
// 			rows.push(row);
// 		});

// 		// Footer rows — same colspan-aware approach
// 		clone.querySelectorAll('tfoot tr').forEach(tr => {
// 			const tds = [...tr.querySelectorAll('td')];
// 			const row = {};
// 			let colIdx = 0;
// 			tds.forEach(td => {
// 				const span = parseInt(td.getAttribute('colspan') || '1');
// 				row[columns[colIdx] ? columns[colIdx].key : ('c'+colIdx)] = _cellValue(td);
// 				colIdx += span;
// 			});
// 			rows.push(row);
// 		});

// 		return { columns, rows };
// 	}

// 	_export_table(tableId, fname, title, format) {
// 		if (tableId === 'cbd_pu_table') { this._export_pending_util_table(format); return; }
// 		const data = this._table_to_columns_rows(tableId);
// 		if (!data || !data.rows.length) {
// 			frappe.show_alert({message:'Table not ready', indicator:'orange'}); return;
// 		}
// 		frappe.show_alert({message:`Generating ${format.toUpperCase()}…`, indicator:'blue'}, 2);
// 		frappe.call({
// 			method: 'creche_reports.api.creche_dashboard.export_table',
// 			args: {
// 				title: title || fname || 'Report',
// 				columns: JSON.stringify(data.columns),
// 				rows: JSON.stringify(data.rows),
// 				format: format,
// 			},
// 			callback: (r) => {
// 				if (r.message && r.message.file_url) {
// 					window.open(r.message.file_url, '_blank');
// 					frappe.show_alert({message:'Download ready', indicator:'green'}, 3);
// 				} else {
// 					frappe.show_alert({message:'Export failed', indicator:'red'}, 4);
// 				}
// 			},
// 			error: () => frappe.show_alert({message:'Export failed — server error', indicator:'red'}, 5),
// 		});
// 	}

// 	_filter_table_rows(tableId, query) {
// 		const table = document.getElementById(tableId);
// 		if (!table) return;
// 		this._filter_one_table(table, query);
// 	}

// 	_filter_one_table(table, query) {
// 		const q = (query || '').trim().toLowerCase();
// 		table.querySelectorAll('tbody tr').forEach(tr => {
// 			if (!q) {
// 				tr.style.display = tr.dataset.paginationHidden === '1' ? 'none' : '';
// 				tr.removeAttribute('data-search-hidden');
// 				return;
// 			}
// 			const hidden = !tr.innerText.toLowerCase().includes(q);
// 			tr.style.display = hidden ? 'none' : '';
// 			if (hidden) tr.setAttribute('data-search-hidden', '1');
// 			else tr.removeAttribute('data-search-hidden');
// 		});
// 	}

// 	// Some modals (e.g. the states map view, which pairs a map with its own
// 	// data table) can contain more than one table — filter all of them from
// 	// a single search box rather than requiring one box per table.
// 	_filter_all_tables_in(containerEl, query) {
// 		if (!containerEl) return;
// 		containerEl.querySelectorAll('table').forEach(table => this._filter_one_table(table, query));
// 	}

// 	// ─────────────────────────────────────────────────────────────────────────
// 	// BUDGET MODAL
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

// 	_render_budget_page2(partner) {
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
// 		// Build rich state data: {state, partners, approved_creches, running_creches}
// 		const _stateMap = {};
// 		partners.forEach(p => {
// 			(p.budgets||[]).forEach(b => {
// 				if (!b.state) return;
// 				if (!_stateMap[b.state]) _stateMap[b.state] = { state: b.state, partnerSet: new Set(), approved_creches: 0, running_creches: 0 };
// 				_stateMap[b.state].partnerSet.add(p.partner_name || p.partner_id || '');
// 				_stateMap[b.state].approved_creches += parseInt(b.no_of_creches || 0);
// 				_stateMap[b.state].running_creches  += parseInt(b.running_creches || 0);
// 			});
// 		});
// 		const all_states_data = Object.values(_stateMap).map(s => ({
// 			state: s.state,
// 			partners: s.partnerSet.size,
// 			approved_creches: s.approved_creches,
// 			running_creches:  s.running_creches,
// 		})).sort((a,b) => a.state.localeCompare(b.state));
// 		const all_states = all_states_data.map(s => s.state); // keep for backward compat count

// 		// Rich district data: {district, state, partners, approved_creches, running_creches}
// 		const _distMap = {};
// 		partners.forEach(p => {
// 			(p.budgets||[]).forEach(b => {
// 				if (!b.district) return;
// 				const key = (b.state||'') + '||' + b.district;
// 				if (!_distMap[key]) _distMap[key] = { district: b.district, state: b.state||'', partnerSet: new Set(), approved: 0, running: 0 };
// 				_distMap[key].partnerSet.add(p.partner_name || '');
// 				_distMap[key].approved += parseInt(b.no_of_creches || 0);
// 				_distMap[key].running  += parseInt(b.running_creches || 0);
// 			});
// 		});
// 		const all_districts_data = Object.values(_distMap)
// 			.map(d => ({ district: d.district, state: d.state, partners: d.partnerSet.size, approved_creches: d.approved, running_creches: d.running }))
// 			.sort((a,b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district));
// 		const all_districts = all_districts_data.map(d => d.district);

// 		// Rich block data: {block, district, state, partners, approved_creches, running_creches}
// 		const _blockMap = {};
// 		partners.forEach(p => {
// 			(p.budgets||[]).forEach(b => {
// 				if (!b.block) return;
// 				const key = (b.state||'') + '||' + (b.district||'') + '||' + b.block;
// 				if (!_blockMap[key]) _blockMap[key] = { block: b.block, district: b.district||'', state: b.state||'', partnerSet: new Set(), approved: 0, running: 0 };
// 				_blockMap[key].partnerSet.add(p.partner_name || '');
// 				_blockMap[key].approved += parseInt(b.no_of_creches || 0);
// 				_blockMap[key].running  += parseInt(b.running_creches || 0);
// 			});
// 		});
// 		const all_blocks_data = Object.values(_blockMap)
// 			.map(b => ({ block: b.block, district: b.district, state: b.state, partners: b.partnerSet.size, approved_creches: b.approved, running_creches: b.running }))
// 			.sort((a,b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district) || a.block.localeCompare(b.block));
// 		const all_blocks = all_blocks_data.map(b => b.block);

// 		const partner_rows = partners.map(p => ({ name: p.partner_name }));
// 		const budget_rows = partners.flatMap(p =>
// 			(p.budgets||[]).map(b => ({ ref: b.budget_reference_name, creches: b.no_of_creches || 0 }))
// 		);

// 		const stats = [
// 			{
// 				key:'partners', value:num_partners, rawCount: num_partners,
// 				label:'Partner'+(num_partners!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
// 				drillData: partner_rows, drillType: 'partners',
// 			},
// 			{
// 				key:'budgets', value:num_budgets, rawCount: num_budgets,
// 				label:'Allocated Budget'+(num_budgets!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
// 				drillData: budget_rows, drillType: 'budgets',
// 			},
// 			{
// 				key:'creches', value:total_creches.toLocaleString('en-IN'), rawCount: total_creches,
// 				label:'Approved Creche'+(total_creches!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
// 				drillData: budget_rows, drillType: 'creches',
// 			},
// 			{
// 				key:'states', value:all_states.length, rawCount: all_states.length,
// 				label:'Working State'+(all_states.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
// 				drillData: all_states_data, drillType: 'states',
// 			},
// 			{
// 				key:'districts', value:all_districts.length, rawCount: all_districts.length,
// 				label:'District'+(all_districts.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
// 				drillData: all_districts_data, drillType: 'districts',
// 			},
// 			{
// 				key:'blocks', value:all_blocks.length, rawCount: all_blocks.length,
// 				label:'Block'+(all_blocks.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
// 				drillData: all_blocks_data, drillType: 'blocks',
// 			},
// 		];

// 		const OSTAT_PALETTE = {
// 			partners:   { color:'#1e3a5f', ibg:'#e8f0fe' },
// 			budgets:    { color:'#1e3a5f', ibg:'#e8f0fe' },
// 			creches:    { color:'#1e3a5f', ibg:'#e8f0fe' },
// 			states:     { color:'#1e3a5f', ibg:'#e8f0fe' },
// 			districts:       { color:'#1e3a5f', ibg:'#e8f0fe' },
// 			blocks:          { color:'#1e3a5f', ibg:'#e8f0fe' },
// 			partners_80pct:  { color:'#15803d', ibg:'#dcfce7' },
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
// 		const accentMap = { partners:'indigo', budgets:'blue', creches:'teal', states:'orange', districts:'violet', blocks:'rose', partners_80pct:'teal' };
// 		const accent = accentMap[stat.drillType] || 'blue';

// 		wrap.innerHTML = `
// 			<div class="cbd-drill-modal ${stat.drillType === 'states' ? 'cbd-drill-modal--full' : 'cbd-drill-modal--narrow'} cbd-drill-modal--${accent}">
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
// 				<div class="cbd-drill-modal__searchbar">
// 					<div class="cbd-dm__search">
// 						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
// 						<input type="text" class="cbd-dm__search-input" id="cbd_drill_search" placeholder="Search...">
// 					</div>
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
// 		const drillSearch = wrap.querySelector('#cbd_drill_search');
// 		if (drillSearch) {
// 			drillSearch.addEventListener('input', () => {
// 				this._filter_all_tables_in(wrap.querySelector('.cbd-drill-modal__body'), drillSearch.value);
// 			});
// 		}
// 		this._drill_key_handler = (e) => { if (e.key === 'Escape') this._close_drill_panel(); };
// 		document.addEventListener('keydown', this._drill_key_handler);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-drill-modal-wrap--open'));

// 		// Make every table in this modal sortable, whatever type of list
// 		// it turned out to be (partners/budgets/creches/states/etc). The
// 		// states map's own table wires itself once its async geo data
// 		// loads, so skip re-wiring it here to avoid a stale early pass.
// 		setTimeout(() => {
// 			wrap.querySelectorAll('table').forEach(t => {
// 				if (!t.id) t.id = 'cbd_dt2_auto_' + Math.random().toString(36).slice(2, 8);
// 				this._make_table_sortable(t.id);
// 			});
// 		}, 80);
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

// 		if (!drillData || !drillData.length)
// 			return '<div class="cbd-drill-empty">No data available.</div>';

// 		const PALETTE = {
// 			partners:  { hdr:'#4F46E5', hdrText:'#fff',  badge:'#EEF2FF', badgeText:'#3730A3', dot:'#818CF8' },
// 			budgets:   { hdr:'#0369A1', hdrText:'#fff',  badge:'#E0F2FE', badgeText:'#075985', dot:'#38BDF8' },
// 			creches:   { hdr:'#0D9488', hdrText:'#fff',  badge:'#CCFBF1', badgeText:'#115E59', dot:'#2DD4BF' },
// 			states:    { hdr:'#B45309', hdrText:'#fff',  badge:'#FEF3C7', badgeText:'#92400E', dot:'#FBBF24' },
// 			districts: { hdr:'#7C3AED', hdrText:'#fff',  badge:'#EDE9FE', badgeText:'#4C1D95', dot:'#A78BFA' },
// 			blocks:    { hdr:'#BE185D', hdrText:'#fff',  badge:'#FCE7F3', badgeText:'#831843', dot:'#F472B6' },
// 			partners_80pct:  { hdr:'#15803D', hdrText:'#fff', badge:'#DCFCE7', badgeText:'#166534', dot:'#4ADE80' },
// 		};
// 		const p = PALETTE[drillType] || PALETTE.partners;

// 		if (drillType === 'partners_80pct') {
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.name || '—')}</td>
// 					<td class="cbd-dt2__cell" style="text-align:right">${this._fmtTip(item.disb,'Disbursed')}</td>
// 					<td class="cbd-dt2__cell" style="text-align:right">${this._fmtTip(item.util,'Utilised')}</td>
// 					<td class="cbd-dt2__badge-cell">
// 						<span class="cbd-dt2__pill" style="background:${p.badge};color:${p.badgeText};border-color:${p.dot}">${item.pct.toFixed(1)}%</span>
// 					</td>
// 				</tr>`).join('');
// 			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr>
// 						<th class="cbd-dt2__th-num">#</th>
// 						<th class="cbd-dt2__th">Partner Name</th>
// 						<th class="cbd-dt2__th cbd-dt2__th--r">Disbursed</th>
// 						<th class="cbd-dt2__th cbd-dt2__th--r">Utilised</th>
// 						<th class="cbd-dt2__th cbd-dt2__th--r">% of Disbursed</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody></table>`;
// 		}

// 		if (drillType === 'partners') {
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.name)}</td>
// 				</tr>`).join('');
// 			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr><th class="cbd-dt2__th-num">#</th><th class="cbd-dt2__th">Partner Name</th></tr></thead>
// 					<tbody>${rows}</tbody></table>`;
// 		}

// 		if (drillType === 'budgets') {
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
// 				</tr>`).join('');
// 			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr><th class="cbd-dt2__th-num">#</th><th class="cbd-dt2__th">Budget Reference</th></tr></thead>
// 					<tbody>${rows}</tbody></table>`;
// 		}

// 		if (drillType === 'creches') {
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
// 					<td class="cbd-dt2__badge-cell">
// 						${item.creches ? `<span class="cbd-dt2__pill" style="background:${p.badge};color:${p.badgeText};border-color:${p.dot}">${item.creches.toLocaleString('en-IN')}</span>` : '—'}
// 					</td>
// 				</tr>`).join('');
// 			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr><th class="cbd-dt2__th-num">#</th><th class="cbd-dt2__th">Budget Reference</th><th class="cbd-dt2__th cbd-dt2__th--r">Creches</th></tr></thead>
// 					<tbody>${rows}</tbody></table>`;
// 		}

// 		// ── States: India Tile Map + table ─────────────────────────────────
// 		if (drillType === 'states') {
// 			return this._render_india_tile_map(drillData);
// 		}

// 		if (drillType === 'districts') return this._render_geo_panel(drillData, 'districts');
// 		if (drillType === 'blocks')    return this._render_geo_panel(drillData, 'blocks');

// 		return '<div class="cbd-drill-empty">No details available.</div>';
// 	}

// 	// ══════════════════════════════════════════════════════════════════
// 	// GEOGRAPHIC MAP: Unified colorful map for States / Districts / Blocks
// 	// ══════════════════════════════════════════════════════════════════

// 	// 20 vibrant distinct colors
// 	_GEO_PALETTE() {
// 		// Outer = fill color (light), each has a matching darker text/border color
// 		return [
// 			'#60a5fa','#34d399','#fb923c','#a78bfa','#f472b6',
// 			'#38bdf8','#4ade80','#fbbf24','#f87171','#2dd4bf',
// 			'#818cf8','#86efac','#fdba74','#c084fc','#6ee7b7',
// 			'#93c5fd','#fcd34d','#d8b4fe','#67e8f9','#fda4af',
// 		];
// 	}

// 	_render_geo_panel(data, type) {
// 		const isBlock  = type === 'blocks';
// 		const geoTblId = 'cbd_geo_tbl_' + Math.random().toString(36).slice(2,7);
// 		const PALETTE  = this._GEO_PALETTE();
// 		const stateSet = new Set(data.map(d=>d.state).filter(Boolean));
// 		const distSet  = new Set(data.map(d=>d.district).filter(Boolean));
// 		const totalApproved = data.reduce((s,d)=>s+(d.approved_creches||0),0);
// 		const stateColors = {};
// 		[...stateSet].sort().forEach((s,i) => stateColors[s] = PALETTE[i % PALETTE.length]);
// 		const sorted = [...data].sort((a,b)=>(a.state||"").localeCompare(b.state||"")
// 			||(a.district||"").localeCompare(b.district||"")
// 			||(a.block||"").localeCompare(b.block||""));
// 		const rows = sorted.map((d,i)=>{
// 			const clr = stateColors[d.state]||'#94a3b8';
// 			const nm  = isBlock ? d.block : d.district;
// 			return `<tr>
// 				<td style="padding:7px 10px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
// 				<td style="padding:7px 10px;font-size:12px;font-weight:600;border-bottom:1px solid #f3f4f6">${frappe.utils.escape_html(nm||'—')}</td>
// 				${isBlock?`<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #f3f4f6">${frappe.utils.escape_html(d.district||'—')}</td>`:''}
// 				<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #f3f4f6">
// 					<span style="display:inline-flex;align-items:center;gap:5px">
// 						<span style="width:8px;height:8px;border-radius:2px;background:${clr};flex-shrink:0"></span>
// 						${frappe.utils.escape_html(d.state||'—')}
// 					</span>
// 				</td>
// 				<td style="padding:7px 10px;font-size:12px;text-align:right;border-bottom:1px solid #f3f4f6">${d.partners||0}</td>
// 				<td style="padding:7px 10px;font-size:12px;text-align:right;color:#1d4ed8;font-weight:600;border-bottom:1px solid #f3f4f6">${(d.approved_creches||0).toLocaleString('en-IN')}</td>
// 			</tr>`;
// 		}).join('');
// 		const cs = isBlock?4:3;
// 		const html_geo = `<div style="font-family:inherit">
// 			<div style="display:flex;gap:8px;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
// 				<div style="flex:1;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:7px 10px;text-align:center">
// 					<div style="font-size:18px;font-weight:800;color:#2563eb">${stateSet.size}</div><div style="font-size:10px;color:#3b82f6;text-transform:uppercase">States</div></div>
// 				${isBlock?`<div style="flex:1;background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:10px;padding:7px 10px;text-align:center"><div style="font-size:18px;font-weight:800;color:#7c3aed">${distSet.size}</div><div style="font-size:10px;color:#8b5cf6;text-transform:uppercase">Districts</div></div>`:''}
// 				<div style="flex:1;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:7px 10px;text-align:center">
// 					<div style="font-size:18px;font-weight:800;color:#16a34a">${data.length}</div><div style="font-size:10px;color:#22c55e;text-transform:uppercase">${isBlock?'Blocks':'Districts'}</div></div>
// 			</div>
// 			<div style="max-height:420px;overflow-y:auto">
// 				<table id="${geoTblId}" style="width:100%;border-collapse:collapse">
// 					<thead><tr style="background:#f9fafb;position:sticky;top:0;z-index:2">
// 						<th class="cbd-dt__th--num" style="padding:8px 10px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:center;width:36px">#</th>
// 						<th style="padding:8px 10px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:left">${isBlock?'Block':'District'}</th>
// 						${isBlock?'<th style="padding:8px 10px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:left">District</th>':''}
// 						<th style="padding:8px 10px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:left">State</th>
// 						<th style="padding:8px 10px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:right">Partners</th>
// 						<th style="padding:8px 10px;font-size:11px;color:#1d4ed8;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:right">Approved</th>
// 				</tr></thead>
// 				<tbody>${rows}</tbody>
// 				<tfoot><tr style="background:#f9fafb">
// 					<td colspan="${cs}" style="padding:8px 10px;font-size:12px;font-weight:700;border-top:2px solid #e5e7eb">Total</td>
// 					<td style="padding:8px 10px;border-top:2px solid #e5e7eb"></td>
// 					<td style="padding:8px 10px;font-size:12px;font-weight:700;color:#1d4ed8;text-align:right;border-top:2px solid #e5e7eb">${totalApproved.toLocaleString('en-IN')}</td>
// 			</tr></tfoot>
// 			</table></div></div>`;
// 		// ── FIX #4 ──
// 		// This function built `html_geo` but never returned it, so every
// 		// caller (District and Block drill-downs) received `undefined`
// 		// back from `_build_ostat_content`, which was then concatenated
// 		// straight into the modal body as the literal text "undefined".
// 		return html_geo;
// 	}

// 		_render_india_tile_map(stateData) { return this._render_states_chart_map(stateData); }
// 	/* ─── India Colorful Political Map (States) ──────────────────────── */
// 	_render_states_chart_map(stateData) {
// 		const mapId   = 'cbd_smap_' + Math.random().toString(36).slice(2, 7);
// 		const PALETTE = this._GEO_PALETTE();

// 		// Assign distinct color per active state
// 		const activeMap = new Map();
// 		(stateData || []).forEach((d, i) => {
// 			activeMap.set(d.state, {
// 				color:            PALETTE[i % PALETTE.length],
// 				approved_creches: d.approved_creches || 0,
// 				partners:         d.partners          || 0,
// 			});
// 		});

// 		const ALIASES = { 'Orissa':'Odisha', 'Uttaranchal':'Uttarakhand', 'Pondicherry':'Puducherry' };

// 		// Totals for footer table
// 		const totalApproved = (stateData||[]).reduce((s,d)=>s+(d.approved_creches||0),0);

// 		// Table rows
// 		const tableRows = (stateData||[]).map((s,i) => {
// 			const clr = activeMap.get(s.state)?.color || '#94a3b8';
// 			return `<tr>
// 				<td style="padding:7px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
// 				<td style="padding:7px 12px;font-size:12px;font-weight:600;border-bottom:1px solid #f3f4f6">
// 					<span style="display:inline-flex;align-items:center;gap:7px">
// 						<span style="width:12px;height:12px;border-radius:3px;background:${clr};flex-shrink:0"></span>
// 						${frappe.utils.escape_html(s.state)}
// 					</span>
// 				</td>
// 				<td style="padding:7px 12px;font-size:12px;text-align:right;border-bottom:1px solid #f3f4f6">${s.partners}</td>
// 				<td style="padding:7px 12px;font-size:12px;text-align:right;color:#1d4ed8;font-weight:600;border-bottom:1px solid #f3f4f6">${(s.approved_creches||0).toLocaleString('en-IN')}</td>
// 			</tr>`;
// 		}).join('');

// 		const html = `
// 			<div style="background:#fff;font-family:inherit">

// 				<!-- Map — fixed 380px -->
// 				<div id="${mapId}"
// 				     style="height:520px;position:relative;overflow:hidden;
// 				            background:linear-gradient(180deg,#e0f2fe 0%,#bae6fd 100%)">
// 					<div id="${mapId}_l"
// 					     style="position:absolute;inset:0;display:flex;align-items:center;
// 					            justify-content:center;flex-direction:column;gap:10px">
// 						<div style="width:36px;height:36px;border:4px solid #bfdbfe;
// 						            border-top-color:#2563eb;border-radius:50%;
// 						            animation:cbd-spin .8s linear infinite"></div>
// 						<span style="font-size:12px;color:#2563eb;font-weight:500">Loading India map…</span>
// 					</div>
// 					<div id="${mapId}_tip"
// 					     style="display:none;position:absolute;padding:10px 14px;
// 					            background:rgba(15,23,42,.93);color:#fff;border-radius:10px;
// 					            font-size:12px;pointer-events:none;z-index:10;max-width:210px;
// 					            line-height:1.6;box-shadow:0 8px 24px rgba(0,0,0,.3)"></div>
// 				</div>

// 				<!-- Data table -->
// 				<div style="max-height:220px;overflow-y:auto;border-top:2px solid #e2e8f0">
// 					<table style="width:100%;border-collapse:collapse">
// 						<thead>
// 							<tr style="background:#f9fafb;position:sticky;top:0;z-index:2">
// 								<th class="cbd-dt__th--num" style="padding:8px 12px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:center;width:36px">#</th>
// 								<th style="padding:8px 12px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:700">State</th>
// 								<th style="padding:8px 12px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:right">Partners</th>
// 								<th style="padding:8px 12px;font-size:11px;color:#1d4ed8;border-bottom:2px solid #e5e7eb;text-align:right;font-weight:700">Approved</th>
// 							</tr>
// 						</thead>
// 						<tbody>${tableRows}</tbody>
// 						<tfoot>
// 							<tr style="background:#f9fafb">
// 								<td colspan="3" style="padding:8px 12px;font-size:12px;font-weight:700;border-top:2px solid #e5e7eb">Total</td>
// 								<td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1d4ed8;text-align:right;border-top:2px solid #e5e7eb">${totalApproved.toLocaleString('en-IN')}</td>
// 							</tr>
// 						</tfoot>
// 					</table>
// 				</div>
// 			</div>`;

// 		const statesTableId = mapId + '_tbl';
// 		// Wire table ID so we can paginate after render
// 		const _htmlWithId = html.replace('<table style="width:100%;border-collapse:collapse">',
// 			`<table id="${statesTableId}" style="width:100%;border-collapse:collapse">`);
// 		const _finalHtml = _htmlWithId !== html ? _htmlWithId : html; // use patched if replaced

// 		setTimeout(() =>
// 			fetch('https://cdn.jsdelivr.net/npm/@svg-maps/india@2.0.0/india.svg')
// 				.then(r => r.text())
// 				.then(svgText => {
// 					this._draw_states_svg_map(svgText, mapId, activeMap, ALIASES);
// 					// Paginate the states data table after map renders
// 					setTimeout(() => this._enhance_table(statesTableId), 100);
// 				})
// 				.catch(err => {
// 					const l = document.getElementById(mapId + '_l');
// 					if (l) l.innerHTML = `<div style="color:#f87171;font-size:12px;text-align:center;padding:20px">
// 						<div style="font-size:28px">🗺</div>
// 						<strong>Map could not load</strong><br>
// 						<span style="font-size:10px;opacity:.7">${frappe.utils.escape_html(err.message)}</span>
// 					</div>`;
// 				})
// 		, 60);
// 		return _finalHtml;
// 	}

// 	// Renders India using the pre-drawn state paths from the @svg-maps/india
// 	// package (same source as embedded in the reference site) rather than a
// 	// geojson + d3 projection — the paths are already in SVG screen-space,
// 	// so we just recolor and re-parent them into our own <svg>.
// 	_draw_states_svg_map(svgText, mapId, activeMap, aliases) {
// 		const wrapper = document.getElementById(mapId);
// 		const loader  = document.getElementById(mapId + '_l');
// 		const tipEl   = document.getElementById(mapId + '_tip');
// 		if (!wrapper) return;

// 		const NS = 'http://www.w3.org/2000/svg';
// 		const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
// 		const sourcePaths = Array.from(parsed.querySelectorAll('path[aria-label]'));

// 		const SHORT = {
// 			'Andaman and Nicobar Islands':'A&N', 'Jammu and Kashmir':'J&K',
// 			'Madhya Pradesh':'M.P.', 'Himachal Pradesh':'H.P.',
// 			'Uttar Pradesh':'U.P.', 'Dadra and Nagar Haveli':'DNH',
// 			'Daman and Diu':'D&D', 'Chandigarh':'Ch.',
// 			'Lakshadweep':'Lk.', 'Puducherry':'Py.', 'Andhra Pradesh':'A.P.',
// 			'Telangana':'T.S.', 'Arunachal Pradesh':'Ar.', 'Chhattisgarh':'C.G.',
// 			'West Bengal':'W.B.', 'Tamil Nadu':'T.N.', 'Uttarakhand':'UK',
// 		};

// 		const resolve = (name) => {
// 			if (activeMap.has(name)) return { name, ...activeMap.get(name) };
// 			const a = aliases[name];
// 			if (a && activeMap.has(a)) return { name: a, ...activeMap.get(a) };
// 			const _norm = s => s.toLowerCase().replace(/&/g, 'and').replace(/[\s.]+/g, '');
// 			const nl = _norm(name);
// 			for (const [k, v] of activeMap) {
// 				if (_norm(k) === nl) return { name: k, ...v };
// 			}
// 			return null;
// 		};

// 		const svg = document.createElementNS(NS, 'svg');
// 		svg.setAttribute('viewBox', '0 0 612 696');
// 		svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
// 		svg.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0';

// 		const defs = document.createElementNS(NS, 'defs');
// 		defs.innerHTML = `<style>@keyframes cbd-spin{to{transform:rotate(360deg)}}</style>`;
// 		svg.appendChild(defs);

// 		const gStates = document.createElementNS(NS, 'g');
// 		const gLabels = document.createElementNS(NS, 'g');
// 		svg.appendChild(gStates);
// 		svg.appendChild(gLabels);

// 		sourcePaths.forEach(srcPath => {
// 			const rawName = srcPath.getAttribute('aria-label') || '';
// 			const data = resolve(rawName);
// 			const fill = data ? data.color : '#d1d5db';

// 			const path = document.createElementNS(NS, 'path');
// 			path.setAttribute('d', srcPath.getAttribute('d'));
// 			path.setAttribute('fill', fill);
// 			path.setAttribute('stroke', '#ffffff');
// 			path.setAttribute('stroke-width', '1');
// 			path.style.cssText = 'transition:fill .2s,transform .2s;transform-origin:center;transform-box:fill-box;cursor:' + (data ? 'pointer' : 'default');
// 			if (data) {
// 				path.addEventListener('mouseenter', () => {
// 					path.setAttribute('fill', '#1d9ad6');
// 					path.style.transform = 'translateY(-2px)';
// 					if (tipEl) {
// 						tipEl.innerHTML = `
// 							<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
// 								<span style="width:12px;height:12px;border-radius:3px;background:${data.color};flex-shrink:0"></span>
// 								<strong style="font-size:13px">${frappe.utils.escape_html(data.name)}</strong>
// 							</div>
// 							<div style="font-size:11px;display:grid;grid-template-columns:auto auto;gap:3px 12px">
// 								<span style="opacity:.8">Partners</span><strong>${data.partners}</strong>
// 								<span style="opacity:.8">Approved</span><strong style="color:#93c5fd">${data.approved_creches.toLocaleString('en-IN')}</strong>
// 							</div>`;
// 						tipEl.classList.add('show');
// 						tipEl.style.display = 'block';
// 					}
// 				});
// 				path.addEventListener('mousemove', (e) => {
// 					if (!tipEl) return;
// 					const r = wrapper.getBoundingClientRect();
// 					tipEl.style.left = (e.clientX - r.left) + 'px';
// 					tipEl.style.top  = (e.clientY - r.top) + 'px';
// 				});
// 				path.addEventListener('mouseleave', () => {
// 					path.setAttribute('fill', fill);
// 					path.style.transform = '';
// 					if (tipEl) { tipEl.classList.remove('show'); tipEl.style.display = 'none'; }
// 				});
// 			}
// 			gStates.appendChild(path);
// 		});

// 		if (loader) loader.remove();
// 		wrapper.appendChild(svg);
// 	}

// 	_draw_states_d3_map_UNUSED(_d3, geo, mapId, activeMap, aliases) {
// 		const wrapper = document.getElementById(mapId);
// 		const loader  = document.getElementById(mapId + '_l');
// 		const tipEl   = document.getElementById(mapId + '_tip');
// 		if (!wrapper) return;

// 		const W = wrapper.offsetWidth  || 520;
// 		const H = wrapper.offsetHeight || 380;

// 		// Short labels for map (to avoid clutter). Keyed on the raw text
// 		// straight from the geojson source (STNAME_SH uses "&").
// 		const SHORT = {
// 			'Andaman & Nicobar':'A&N', 'Jammu & Kashmir':'J&K', 'Ladakh':'Lad.',
// 			'Madhya Pradesh':'M.P.', 'Himachal Pradesh':'H.P.',
// 			'Uttar Pradesh':'U.P.', 'Dadra & Nagar Haveli':'DNH',
// 			'Daman & Diu':'D&D', 'Chandigarh':'Ch.',
// 			'Lakshadweep':'Lk.', 'Puducherry':'Py.',
// 			'Pondicherry':'Py.', 'Andhra Pradesh':'A.P.',
// 			'Telangana':'T.S.',
// 			'Arunachal Pradesh':'Ar.', 'Chhattisgarh':'C.G.',
// 			'West Bengal':'W.B.', 'Tamil Nadu':'T.N.',
// 			'Uttaranchal':'UK', 'Uttarakhand':'UK',
// 		};

// 		const resolve = (name) => {
// 			if (activeMap.has(name)) return { name, ...activeMap.get(name) };
// 			const a = aliases[name];
// 			if (a && activeMap.has(a)) return { name: a, ...activeMap.get(a) };
// 			// Normalize '&' vs 'and' and punctuation/whitespace differences
// 			// (e.g. geojson "Jammu & Kashmir" vs dashboard data "Jammu and
// 			// Kashmir") rather than needing an exhaustive alias for every
// 			// state spelled either way.
// 			const _norm = s => s.toLowerCase().replace(/&/g, 'and').replace(/[\s.]+/g, '');
// 			const nl = _norm(name);
// 			for (const [k, v] of activeMap) {
// 				if (_norm(k) === nl) return { name: k, ...v };
// 			}
// 			return null;
// 		};

// 		const proj   = _d3.geoMercator().fitSize([W - 8, H - 8], geo);
// 		const pathFn = _d3.geoPath().projection(proj);
// 		const NS     = 'http://www.w3.org/2000/svg';

// 		const svg = document.createElementNS(NS, 'svg');
// 		svg.setAttribute('width', W);
// 		svg.setAttribute('height', H);
// 		svg.style.cssText = 'display:block;position:absolute;inset:0';

// 		const defs = document.createElementNS(NS, 'defs');
// 		defs.innerHTML = `
// 			<filter id="${mapId}_sh">
// 				<feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.2"/>
// 			</filter>
// 			<style>@keyframes cbd-spin{to{transform:rotate(360deg)}}</style>`;
// 		svg.appendChild(defs);

// 		const gStates = document.createElementNS(NS, 'g');
// 		gStates.setAttribute('transform', 'translate(4,4)');
// 		svg.appendChild(gStates);

// 		const gLabels = document.createElementNS(NS, 'g');
// 		gLabels.setAttribute('transform', 'translate(4,4)');
// 		svg.appendChild(gLabels);

// 		// Inactive states get a muted but still visible color
// 		const INACTIVE_COLORS = [
// 			'#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0',
// 			'#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0',
// 		];
// 		let inactiveIdx = 0;

// 		geo.features.forEach(feat => {
// 			const raw  = feat.properties.STNAME_SH || feat.properties.STNAME || '';
// 			const data = resolve(raw);
// 			const dStr = pathFn(feat);
// 			if (!dStr) return;

// 			const fill   = data ? data.color : '#d1d5db';
// 			const stroke = '#ffffff';

// 			const path = document.createElementNS(NS, 'path');
// 			path.setAttribute('d', dStr);
// 			path.setAttribute('fill', fill);
// 			path.setAttribute('stroke', stroke);
// 			path.setAttribute('stroke-width', data ? '1' : '0.5');
// 			path.style.transition = 'fill .15s';
// 			path.style.cursor = data ? 'pointer' : 'default';
// 			if (data) path.setAttribute('filter', `url(#${mapId}_sh)`);

// 			if (data) {
// 				const darkerFill = _d3.color(fill).darker(0.35).toString();
// 				path.addEventListener('mouseenter', () => {
// 					path.setAttribute('fill', darkerFill);
// 					if (tipEl) {
// 						tipEl.innerHTML = `
// 							<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
// 								<span style="width:12px;height:12px;border-radius:3px;background:${data.color};flex-shrink:0"></span>
// 								<strong style="font-size:13px">${frappe.utils.escape_html(data.name)}</strong>
// 							</div>
// 							<div style="font-size:11px;display:grid;grid-template-columns:auto auto;gap:3px 12px">
// 								<span style="opacity:.8">Partners</span><strong>${data.partners}</strong>
// 								<span style="opacity:.8">Approved</span><strong style="color:#93c5fd">${data.approved_creches.toLocaleString('en-IN')}</strong>
// 							</div>`;
// 						tipEl.style.display = 'block';
// 					}
// 				});
// 				path.addEventListener('mousemove', ev => {
// 					if (!tipEl) return;
// 					const rc = wrapper.getBoundingClientRect();
// 					tipEl.style.left = Math.min(ev.clientX-rc.left+12, rc.width-215)+'px';
// 					tipEl.style.top  = Math.max(ev.clientY-rc.top-10, 4)+'px';
// 				});
// 				path.addEventListener('mouseleave', () => {
// 					path.setAttribute('fill', fill);
// 					if (tipEl) tipEl.style.display = 'none';
// 				});
// 			}

// 			gStates.appendChild(path);
// 		});

// 		// Draw state name labels in a second pass (on top of all shapes)
// 		geo.features.forEach(feat => {
// 			const raw  = feat.properties.STNAME_SH || feat.properties.STNAME || '';
// 			const data = resolve(raw);
// 			try {
// 				const [cx, cy] = pathFn.centroid(feat);
// 				if (isNaN(cx) || isNaN(cy)) return;
// 				const dStr = pathFn(feat);
// 				if (!dStr) return;

// 				// Compute rough area to decide font size
// 				const area    = pathFn.area(feat);
// 				const label   = SHORT[raw] || raw;
// 				const words   = label.split(' ');
// 				const fs      = data ? (area > 3000 ? 9 : area > 800 ? 7.5 : 6) : (area > 3000 ? 7 : 5.5);
// 				const fill    = data ? '#fff' : 'rgba(0,0,0,0.35)';
// 				const weight  = data ? '700' : '400';

// 				const tg = document.createElementNS(NS, 'g');
// 				tg.setAttribute('transform', `translate(${cx},${cy})`);
// 				tg.setAttribute('pointer-events', 'none');

// 				const lineH = fs + 1.5;
// 				const startY = -((words.length - 1) * lineH) / 2;
// 				words.forEach((word, wi) => {
// 					const t = document.createElementNS(NS, 'text');
// 					t.setAttribute('text-anchor', 'middle');
// 					t.setAttribute('y', startY + wi * lineH + fs * 0.35);
// 					t.setAttribute('font-size', fs);
// 					t.setAttribute('font-weight', weight);
// 					t.setAttribute('fill', fill);
// 					t.setAttribute('font-family', 'inherit');
// 					// Text stroke for readability on light inactive states
// 					if (!data) {
// 						t.setAttribute('stroke', 'rgba(255,255,255,0.6)');
// 						t.setAttribute('stroke-width', '0.4');
// 						t.setAttribute('paint-order', 'stroke');
// 					}
// 					t.textContent = word;
// 					tg.appendChild(t);
// 				});
// 				gLabels.appendChild(tg);
// 			} catch(_) {}
// 		});

// 		if (loader) loader.style.display = 'none';
// 		wrapper.appendChild(svg);
// 	}

// 		_draw_geo_d3_map(_d3, mapId, geoUrl, nameKey, aliases, activeMap, type) {
// 		const wrapper = document.getElementById(mapId);
// 		const loader  = document.getElementById(mapId + '_l');
// 		const tipEl   = document.getElementById(mapId + '_tip');
// 		if (!wrapper) return;

// 		const _lightenHex = (hex, amt) => {
// 			try {
// 				const n = parseInt(hex.replace('#', ''), 16);
// 				const r = Math.min(255, Math.max(0, ((n >> 16) & 0xFF) + amt));
// 				const g = Math.min(255, Math.max(0, ((n >> 8)  & 0xFF) + amt));
// 				const b = Math.min(255, Math.max(0, ( n        & 0xFF) + amt));
// 				return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
// 			} catch(e) { return hex; }
// 		};

// 		const resolve = (raw) => {
// 			if (activeMap.has(raw)) return activeMap.get(raw);
// 			const a = aliases[raw];
// 			if (a && activeMap.has(a)) return activeMap.get(a);
// 			for (const [k, v] of activeMap)
// 				if (k.toLowerCase().includes(raw.toLowerCase()) || raw.toLowerCase().includes(k.toLowerCase()))
// 					return v;
// 			return null;
// 		};

// 		fetch(geoUrl)
// 			.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
// 			.then(geo => {
// 				// For district/block view: restrict to states with data for faster render
// 				let features = geo.features;
// 				if (type !== 'states') {
// 					const activeStates = new Set(
// 						(this._all_partners || []).flatMap(p => (p.budgets || []).map(b => b.state).filter(Boolean))
// 					);
// 					const statesWithAlias = new Set([...activeStates,
// 						...Object.entries(aliases).filter(([,v]) => activeStates.has(v)).map(([k]) => k)]);
// 					const filtered = features.filter(f => statesWithAlias.has(f.properties.NAME_1));
// 					if (filtered.length) features = filtered;
// 				}

// 				const W = wrapper.offsetWidth  || 460;
// 				const H = wrapper.offsetHeight || 280;
// 				const displayGeo = { type: 'FeatureCollection', features };
// 				const fullGeo    = type === 'states' ? geo : displayGeo;
// 				const proj       = _d3.geoMercator().fitSize([W - 8, H - 8], fullGeo);
// 				const pathFn     = _d3.geoPath().projection(proj);

// 				const NS  = 'http://www.w3.org/2000/svg';
// 				const svg = document.createElementNS(NS, 'svg');
// 				svg.setAttribute('width',  W);
// 				svg.setAttribute('height', H);
// 				svg.style.cssText = 'display:block;position:absolute;inset:0';

// 				const defs = document.createElementNS(NS, 'defs');
// 				defs.innerHTML =
// 					`<filter id="${mapId}_sh">
// 						<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#00000020"/>
// 					</filter>
// 					<style>@keyframes cbd-spin{to{transform:rotate(360deg)}}</style>`;
// 				svg.appendChild(defs);

// 				const g = document.createElementNS(NS, 'g');
// 				g.setAttribute('transform', 'translate(4,4)');
// 				svg.appendChild(g);

// 				// Render features
// 				const renderSet = type === 'states' ? geo.features : features;
// 				renderSet.forEach(feat => {
// 					const raw  = feat.properties[nameKey] || '';
// 					const meta = resolve(raw);
// 					const dStr = pathFn(feat);
// 					if (!dStr) return;

// 					const fill  = meta ? meta.color : (type === 'states' ? '#e2e8f0' : '#dbeafe');
// 					const hover = meta ? _lightenHex(meta.color, -30) : '#cbd5e1';

// 					const path = document.createElementNS(NS, 'path');
// 					path.setAttribute('d', dStr);
// 					path.setAttribute('fill', fill);
// 					path.setAttribute('stroke', '#ffffff');
// 					path.setAttribute('stroke-width', type === 'states' ? '0.8' : '0.5');
// 					path.setAttribute('filter', `url(#${mapId}_sh)`);
// 					path.style.transition = 'fill .12s';
// 					path.style.cursor = meta ? 'pointer' : 'default';

// 					// Tooltip
// 					const tipHtml = meta
// 						? (() => {
// 							const d0 = meta.items[0];
// 							if (type === 'states')
// 								return `<strong>${frappe.utils.escape_html(d0.state)}</strong>`;
// 							if (type === 'districts')
// 								return `<strong>${frappe.utils.escape_html(d0.district)}</strong>
// 								        <br><span style="opacity:.75;font-size:10px">${frappe.utils.escape_html(d0.state)}</span>`;
// 							// blocks
// 							const bnames = meta.items.map(b => frappe.utils.escape_html(b.block)).join(', ');
// 							return `<strong>${frappe.utils.escape_html(raw)}</strong><br>
// 							        <span style="font-size:10px;opacity:.8">${bnames}</span>`;
// 						  })()
// 						: frappe.utils.escape_html(raw);

// 					path.addEventListener('mouseenter', () => {
// 						path.setAttribute('fill', hover);
// 						if (tipEl) { tipEl.innerHTML = tipHtml; tipEl.style.display = 'block'; }
// 					});
// 					path.addEventListener('mousemove', ev => {
// 						if (!tipEl) return;
// 						const rc = wrapper.getBoundingClientRect();
// 						tipEl.style.left = Math.min(ev.clientX - rc.left + 12, rc.width  - 210) + 'px';
// 						tipEl.style.top  = Math.max(ev.clientY - rc.top  - 10, 4)               + 'px';
// 					});
// 					path.addEventListener('mouseleave', () => {
// 						path.setAttribute('fill', fill);
// 						if (tipEl) tipEl.style.display = 'none';
// 					});

// 					g.appendChild(path);

// 					// State/District name label on centroid (active only)
// 					if (meta) {
// 						try {
// 							const [cx, cy] = pathFn.centroid(feat);
// 							if (isNaN(cx) || isNaN(cy)) return;
// 							const t = document.createElementNS(NS, 'text');
// 							t.setAttribute('x', cx);
// 							t.setAttribute('y', cy + 3);
// 							t.setAttribute('text-anchor', 'middle');
// 							t.setAttribute('font-size', '8');
// 							t.setAttribute('font-weight', '700');
// 							t.setAttribute('fill', '#fff');
// 							t.setAttribute('pointer-events', 'none');
// 							t.setAttribute('paint-order', 'stroke');
// 							t.setAttribute('stroke', meta.color);
// 							t.setAttribute('stroke-width', '3');
// 							t.setAttribute('stroke-linejoin', 'round');
// 							const label = raw.split(' ').map(w => w[0]).join('').substring(0, 3);
// 							t.textContent = label;
// 							g.appendChild(t);
// 						} catch(_) {}
// 					}
// 				});

// 				if (loader) loader.style.display = 'none';
// 				wrapper.appendChild(svg);
// 			})
// 			.catch(err => {
// 				if (loader) loader.innerHTML =
// 					`<div style="text-align:center;padding:20px;color:#f87171;font-size:12px">
// 						<div style="font-weight:600">Map could not load</div>
// 						<div style="font-size:10px;opacity:.7;margin-top:4px">${frappe.utils.escape_html(err.message)}</div>
// 					</div>`;
// 			});
// 	}

// 		_ensure_d3() {
// 		if (typeof d3 !== 'undefined') return Promise.resolve(d3);
// 		return new Promise((resolve, reject) => {
// 			const CDNS = [
// 				'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js',
// 				'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
// 			];
// 			const tryNext = (i) => {
// 				if (i >= CDNS.length) { reject(new Error('D3 unavailable')); return; }
// 				if (document.querySelector(`script[src="${CDNS[i]}"]`)) {
// 					const wait = setInterval(() => { if (typeof d3 !== 'undefined') { clearInterval(wait); resolve(d3); } }, 50);
// 					setTimeout(() => { clearInterval(wait); tryNext(i+1); }, 3000);
// 					return;
// 				}
// 				const s = document.createElement('script');
// 				s.src = CDNS[i];
// 				s.onload  = () => resolve(window.d3 || d3);
// 				s.onerror = () => tryNext(i + 1);
// 				document.head.appendChild(s);
// 			};
// 			tryNext(0);
// 		});
// 	}

// 		/* ═══════════════════════════════════════════════════════════════════
// 	   ANALYTICS CHARTS — Modern visualizations for financial analysis
// 	   ═══════════════════════════════════════════════════════════════════ */
// 	_render_analytics_charts(s, partners) {
// 		const root = document.getElementById('cbd_analytics_section');
// 		if (!root) return;

// 		const _f   = v => parseFloat(v) || 0;
// 		const _cr  = v => this._fmtCr(v);
// 		const _pct = (a, b) => b ? Math.min(100, Math.max(0, (a / b) * 100)) : 0;

// 		const budget = _f(s.total_budget), disb = _f(s.total_disbursement);
// 		const util   = _f(s.total_utilisation), bank = _f(s.total_bank_balance);
// 		const disbPct = _pct(disb, budget), utilPct = _pct(util, budget);
// 		const utilOfDisb = _pct(util, disb);
// 		const bankOfDisb = _pct(bank, disb);

// 		// ── CHART 1: Budget Pipeline (horizontal stacked bars) ─────────────
// 		const _pipeBar = (label, value, pct, color, subtext) => `
// 			<div style="margin-bottom:14px">
// 				<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
// 					<span style="font-size:12px;font-weight:600;color:#374151">${label}</span>
// 					<span style="font-size:13px;font-weight:700;color:${color}">${_cr(value)}</span>
// 				</div>
// 				<div style="height:10px;background:#f3f4f6;border-radius:6px;overflow:hidden">
// 					<div style="height:100%;width:${Math.max(pct,0).toFixed(1)}%;background:${color};border-radius:6px;
// 					            transition:width 0.8s cubic-bezier(.4,0,.2,1)"></div>
// 				</div>
// 				<div style="font-size:10px;color:#9ca3af;margin-top:2px">${subtext}</div>
// 			</div>`;

// 		// ── CHART 2: Partner utilisation cards ─────────────────────────────
// 		const partnerBars = partners.map(p => {
// 			const pb = _f(p.total_budget), pu = _f(p.total_utilisation), pd = _f(p.total_disbursement);
// 			const pUp = _pct(pu, pb), pDp = _pct(pd, pb);
// 			const statusColor = pUp < 25 ? '#dc2626' : pUp < 60 ? '#d97706' : '#16a34a';
// 			const statusLabel = pUp < 25 ? 'Low' : pUp < 60 ? 'Moderate' : 'Good';
// 			return `
// 				<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;
// 				            box-shadow:0 1px 3px rgba(0,0,0,.06)">
// 					<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
// 						<div style="font-size:12px;font-weight:700;color:#111827;flex:1;min-width:0;
// 						            white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
// 						     title="${frappe.utils.escape_html(p.partner_name||'')}">
// 							${frappe.utils.escape_html(p.partner_name||'—')}
// 						</div>
// 						<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;
// 						             background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}30;
// 						             flex-shrink:0;margin-left:8px">${statusLabel}</span>
// 					</div>
// 					<!-- Utilisation bar -->
// 					<div style="font-size:10px;color:#6b7280;margin-bottom:3px;display:flex;justify-content:space-between">
// 						<span>Utilized</span><span style="color:${statusColor};font-weight:600">${pUp.toFixed(1)}%</span>
// 					</div>
// 					<div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;margin-bottom:8px">
// 						<div style="height:100%;width:${pUp.toFixed(1)}%;background:${statusColor};border-radius:4px;
// 						            transition:width 0.8s .1s cubic-bezier(.4,0,.2,1)"></div>
// 					</div>
// 					<!-- Disbursement bar -->
// 					<div style="font-size:10px;color:#6b7280;margin-bottom:3px;display:flex;justify-content:space-between">
// 						<span>Released</span><span style="color:#059669;font-weight:600">${pDp.toFixed(1)}%</span>
// 					</div>
// 					<div style="height:6px;background:#f3f4f6;border-radius:4px;overflow:hidden;margin-bottom:10px">
// 						<div style="height:100%;width:${pDp.toFixed(1)}%;background:#059669;border-radius:4px;
// 						            transition:width 0.8s .2s cubic-bezier(.4,0,.2,1)"></div>
// 					</div>
// 					<!-- Metrics row -->
// 					<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
// 						<div style="text-align:center;background:#f9fafb;border-radius:6px;padding:5px">
// 							<div style="font-size:11px;font-weight:700;color:#2563eb">${_cr(pb)}</div>
// 							<div style="font-size:9px;color:#9ca3af">Budget</div>
// 						</div>
// 						<div style="text-align:center;background:#f9fafb;border-radius:6px;padding:5px">
// 							<div style="font-size:11px;font-weight:700;color:#d97706">${_cr(pu)}</div>
// 							<div style="font-size:9px;color:#9ca3af">Utilized</div>
// 						</div>
// 						<div style="text-align:center;background:#f9fafb;border-radius:6px;padding:5px">
// 							<div style="font-size:11px;font-weight:700;color:#0891b2">${_cr(_f(p.total_bank_balance))}</div>
// 							<div style="font-size:9px;color:#9ca3af">Bank</div>
// 						</div>
// 					</div>
// 				</div>`;
// 		}).join('');

// 		// ── CHART 4: Fund Flow waterfall (visual flow) ────────────────────
// 		const flowSteps = [
// 			{ label:'Approved Budget', val: budget, color:'#2563eb', icon:'🏛' },
// 			{ label:'Released to Partners', val: disb,   color:'#059669', icon:'→' },
// 			{ label:'Funds Utilized',    val: util,   color:'#d97706', icon:'✓' },
// 			{ label:'Cash in Banks',     val: bank,   color:'#0891b2', icon:'🏦' },
// 		];
// 		const maxFlow = Math.max(...flowSteps.map(f => Math.abs(f.val)), 1);
// 		const flowBars = flowSteps.map((f, i) => {
// 			const w = (Math.abs(f.val) / maxFlow * 100).toFixed(1);
// 			const connector = i < flowSteps.length - 1 ?
// 				`<div style="display:flex;align-items:center;padding:2px 0 2px 20px">
// 					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2">
// 						<polyline points="6 9 12 15 18 9"/>
// 					</svg></div>` : '';
// 			return `
// 				<div style="display:flex;align-items:center;gap:10px;padding:5px 0">
// 					<div style="width:28px;height:28px;border-radius:50%;background:${f.color}18;
// 					            display:flex;align-items:center;justify-content:center;
// 					            font-size:13px;flex-shrink:0">${f.icon}</div>
// 					<div style="flex:1;min-width:0">
// 						<div style="font-size:11px;color:#6b7280;margin-bottom:3px">${f.label}</div>
// 						<div style="height:22px;background:#f9fafb;border-radius:4px;overflow:hidden;position:relative">
// 							<div style="position:absolute;inset:0 0 0 0;height:100%;width:${w}%;
// 							            background:${f.color};border-radius:4px;opacity:0.85;
// 							            transition:width 0.9s ${i*0.15}s cubic-bezier(.4,0,.2,1)"></div>
// 							<div style="position:absolute;inset:0;display:flex;align-items:center;
// 							            padding:0 8px;font-size:11px;font-weight:700;color:#fff;
// 							            mix-blend-mode:overlay">${_cr(f.val)}</div>
// 						</div>
// 					</div>
// 					<div style="width:52px;text-align:right;font-size:11px;font-weight:700;color:${f.color};flex-shrink:0">
// 						${i === 0 ? '100%' : _pct(f.val, budget).toFixed(1) + '%'}
// 					</div>
// 				</div>${connector}`;
// 		}).join('');

// 		// ── Assemble the analytics section HTML ───────────────────────────
// 		root.innerHTML = `
// 			<div class="cbd-section-header">
// 				<span class="cbd-section-title">ANALYTICS OVERVIEW</span>
// 			</div>
// 			<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding:16px">

// 				<!-- Chart 1: Fund Flow Pipeline -->
// 				<div class="cbd-chart-card">
// 					<div class="cbd-chart-card__title">
// 						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
// 						Fund Flow Pipeline
// 					</div>
// 					<div class="cbd-chart-card__sub">Budget → Released → Utilized → Bank</div>
// 					<div style="margin-top:8px">${flowBars}</div>
// 				</div>

// 				<!-- Chart 2: Utilisation Progress -->
// 				<div class="cbd-chart-card">
// 					<div class="cbd-chart-card__title">
// 						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
// 						Budget Utilisation Progress
// 					</div>
// 					<div class="cbd-chart-card__sub">How much of each allocation has been used</div>
// 					<div style="margin-top:12px">
// 						${_pipeBar('Funds Released to Partners', disb, disbPct, '#059669', `${disbPct.toFixed(1)}% of approved budget`)}
// 						${_pipeBar('Funds Utilized by Partners', util, utilPct, '#d97706', `${utilPct.toFixed(1)}% of approved budget`)}
// 						${_pipeBar('Utilized vs Released', util, utilOfDisb, '#7c3aed', `${utilOfDisb.toFixed(1)}% of released funds utilized`)}
// 						${_pipeBar('Cash in Partner Banks', bank, bankOfDisb, '#0891b2', `${bankOfDisb.toFixed(1)}% of released funds in bank`)}
// 					</div>
// 				</div>

// 				<!-- Chart 4: Partner Performance -->
// 				${partners.length > 0 ? `<div class="cbd-chart-card" style="grid-column:1/-1">
// 					<div class="cbd-chart-card__title">
// 						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
// 						Partner-wise Performance
// 					</div>
// 					<div class="cbd-chart-card__sub">Utilization &amp; disbursement progress per partner · Green = good (≥60%) · Amber = moderate · Red = low (&lt;25%)</div>
// 					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:12px">
// 						${partnerBars}
// 					</div>
// 				</div>` : ''}

// 			</div>`;
// 	}

// 		render_partners(partners) {
// 		this._all_partners = partners || [];
// 		this._render_overview_strip(partners || []);
// 	}

// 	// ─── Number formatting ──────────────────────────────────────────────

// 	// ═══════════════════════════════════════════════════════
// 	// TABLE UTILITIES: sort, paginate (15 rows/page), both
// 	// ═══════════════════════════════════════════════════════

// 	_enhance_table(tableId) {
// 		this._make_table_sortable(tableId);
// 		this._paginate_table(tableId);
// 	}

// 	// ── FIX (revised again) ──
// 	// Two sticky layers stack on top of each other here: the expand/count
// 	// bar (top:0) and, right below it, the column header row. Every <th>
// 	// in the header row MUST share the exact same top offset — if even
// 	// one cell gets a different value (this previously happened to the
// 	// "#" column, which ended up with an inline top:0 while its siblings
// 	// had top:31.99px), that one cell stops lining up with the rest of
// 	// the sticky header during horizontal scroll, since sticky-left and
// 	// sticky-top are combined on the "#"/"Expense Type" columns. The fix
// 	// is to compute the offset ONCE and assign it to every <th> in the
// 	// same pass (no per-cell branching), which is what the loop below
// 	// does.
// 	//
// 	// Main-head divider rows ("Annual Recurring operating cost" etc) are
// 	// sticky again too, pinned directly below the column header — see
// 	// CSS: .cbd-li-scrollbody .cbd-grp__header-row td. Their offset
// 	// (barH + theadH) is computed here from the same measurements so it
// 	// always matches the header's real height instead of a guessed
// 	// constant, and every group row gets that identical offset (the
// 	// standard "sticky section header" pattern: the active group's title
// 	// stays pinned, the next group's title pushes it out as you scroll
// 	// past — it does not overlap or hide other groups).
// 	_sync_li_header_offset(tableId) {
// 		const MIN_THEAD_H = 30; // sane floor — real header rows are always at least this tall
// 		let attempts = 0;
// 		const apply = () => {
// 			const table = document.getElementById(tableId);
// 			if (!table) return;
// 			const scopeEl = table.closest('.cbd-li-scrollbody') || table.parentElement;
// 			const bar = scopeEl ? scopeEl.querySelector('.cbd-li__expand-bar') : null;
// 			const thead = table.querySelector('thead');
// 			const headerRow = thead ? thead.querySelector('tr') : null;
// 			if (!bar || !thead || !headerRow) return;
// 			let theadH = headerRow.getBoundingClientRect().height || thead.offsetHeight || 0;
// 			// If the header row hasn't actually laid out yet (0 height),
// 			// retry a few times before falling back to a safe floor rather
// 			// than ever committing a broken value.
// 			if (theadH === 0 && attempts < 6) { attempts++; setTimeout(apply, 60); return; }
// 			if (theadH === 0) theadH = MIN_THEAD_H;

// 			// Every header cell gets the SAME offset, in one pass — this
// 			// is what keeps the sticky-left "#"/"Expense Type" columns
// 			// aligned with the rest of the header during horizontal
// 			// scroll (previously one cell could end up with a stale/
// 			// different inline top than its siblings).
// 			const headerTop = 0;
// 			headerRow.querySelectorAll('th').forEach(th => { th.style.top = headerTop + 'px'; });

// 			// Main-head divider ("main item") rows stick right below the
// 			// column header — same offset for every group row.
// 			const groupTop = Math.round(theadH);
// 			table.querySelectorAll('.cbd-grp__header-row td').forEach(td => { td.style.top = groupTop + 'px'; });
// 		};
// 		// A single requestAnimationFrame isn't always enough right after a
// 		// large innerHTML swap (many month columns can take more than one
// 		// frame to finish layout).
// 		requestAnimationFrame(() => requestAnimationFrame(apply));
// 		setTimeout(apply, 150);
// 	}

// 	// Two independent checkboxes: one collapses all month columns down to
// 	// just the Total column, the other collapses every group down to just
// 	// its main-head divider (hiding individual line items). Checked =
// 	// expanded (the default/current view), unchecked = collapsed.
// 	_wire_li_expand_checkboxes(tableId) {
// 		const table = document.getElementById(tableId);
// 		if (!table) return;
// 		const scopeEl = table.closest('.cbd-li-scrollbody') || table.parentElement;
// 		if (!scopeEl) return;
// 		const monthsChk = scopeEl.querySelector('.cbd-li__months-chk');
// 		const itemsChk  = scopeEl.querySelector('.cbd-li__items-chk');
// 		if (monthsChk) {
// 			monthsChk.addEventListener('change', () => {
// 				table.classList.toggle('cbd-li-months-collapsed', !monthsChk.checked);
// 				this._sync_li_header_offset(tableId);
// 			});
// 		}
// 		if (itemsChk) {
// 			itemsChk.addEventListener('change', () => {
// 				const expand = itemsChk.checked;
// 				table.classList.toggle('cbd-li-items-collapsed', !expand);
// 				// Force every row's display explicitly (not just clear to
// 				// empty and defer to the CSS class) — a prior per-group
// 				// click override otherwise could keep a specific group
// 				// stuck the way it was, ignoring the checkbox.
// 				table.querySelectorAll('.cbd-grp__child-row').forEach(r => {
// 					r.style.display = expand ? 'table-row' : 'none';
// 				});
// 				table.querySelectorAll('.cbd-grp__header-row').forEach(h => h.classList.remove('cbd-grp__header-row--collapsed'));
// 				this._sync_li_header_offset(tableId);
// 			});
// 		}
// 		this._wire_li_group_toggles(tableId);
// 	}

// 	// Clicking a main-head divider expands/collapses just that group's
// 	// line items — an accordion-style override on top of whatever the
// 	// global "Show line items" checkbox currently has set.
// 	_wire_li_group_toggles(tableId) {
// 		const table = document.getElementById(tableId);
// 		if (!table) return;
// 		table.querySelectorAll('.cbd-grp__header-row').forEach(header => {
// 			header.addEventListener('click', () => {
// 				const gid = header.dataset.grpTarget;
// 				if (!gid) return;
// 				const rows = table.querySelectorAll(`.cbd-grp__child-row[data-grp-parent="${gid}"]`);
// 				if (!rows.length) return;
// 				const currentlyVisible = window.getComputedStyle(rows[0]).display !== 'none';
// 				const nextDisplay = currentlyVisible ? 'none' : 'table-row';
// 				rows.forEach(r => { r.style.display = nextDisplay; });
// 				header.classList.toggle('cbd-grp__header-row--collapsed', currentlyVisible);
// 				this._sync_li_header_offset(tableId);
// 			});
// 		});
// 	}

// 	_make_table_sortable(tableId) {
// 		const table = document.getElementById(tableId);
// 		if (!table) return;
// 		if (table.dataset.sortWired === '1') return; // never double-wire click listeners
// 		table.dataset.sortWired = '1';
// 		const ths = [...table.querySelectorAll('thead th')];
// 		const ACTION_WIDTHS = new Set(['90px','110px','130px','200px','160px']);
// 		let sortCol = -1, sortAsc = true;

// 		ths.forEach((th, colIdx) => {
// 			if (ACTION_WIDTHS.has(th.style.width)) return;
// 			if (th.classList.contains('cbd-dt__th--num')) return; // skip # col
// 			th.style.cursor = 'pointer';
// 			th.style.userSelect = 'none';
// 			if (!th.querySelector('.cbd-sort-icon')) {
// 				const icon = document.createElement('span');
// 				icon.className = 'cbd-sort-icon';
// 				icon.textContent = ' ⇅';
// 				th.appendChild(icon);
// 			}
// 			th.addEventListener('click', () => {
// 				if (sortCol === colIdx) sortAsc = !sortAsc;
// 				else { sortCol = colIdx; sortAsc = true; }
// 				// Reset all icons
// 				ths.forEach(t => { const ic=t.querySelector('.cbd-sort-icon'); if(ic) ic.textContent=' ⇅'; });
// 				const ic = th.querySelector('.cbd-sort-icon');
// 				if (ic) ic.textContent = sortAsc ? ' ▲' : ' ▼';
// 				// Sort visible rows only (exclude group headers)
// 				const tbody = table.querySelector('tbody');
// 				if (!tbody) return;
// 				const dataRows = [...tbody.querySelectorAll('tr.cbd-dt__row')];
// 				dataRows.sort((a, b) => {
// 					const ac = a.querySelectorAll('td')[colIdx];
// 					const bc = b.querySelectorAll('td')[colIdx];
// 					if (!ac || !bc) return 0;
// 					const at = (ac.textContent||'').trim();
// 					const bt = (bc.textContent||'').trim();
// 					// Clean numeric sort (handles ₹, K, L, Cr, %)
// 					const _num = s => {
// 						const cleaned = s.replace(/[₹,%\s]/g,'');
// 						if (/Cr$/i.test(cleaned)) return parseFloat(cleaned)*10000000;
// 						if (/L$/i.test(cleaned))  return parseFloat(cleaned)*100000;
// 						if (/K$/i.test(cleaned))  return parseFloat(cleaned)*1000;
// 						return parseFloat(cleaned);
// 					};
// 					const an = _num(at), bn = _num(bt);
// 					if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an-bn : bn-an;
// 					return sortAsc ? at.localeCompare(bt) : bt.localeCompare(at);
// 				});
// 				dataRows.forEach(r => tbody.appendChild(r));
// 				// Re-apply pagination after sort
// 				const pagerCtx = table._pagerCtx;
// 				if (pagerCtx) { pagerCtx.currentPage = 1; pagerCtx.render(); }
// 			});
// 		});
// 	}

// 	_paginate_table(tableId, pageSize = 15) {
// 		const table = document.getElementById(tableId);
// 		if (!table) return;
// 		const tbody = table.querySelector('tbody');
// 		if (!tbody) return;

// 		// Remove old pager if re-applied
// 		const oldPager = document.getElementById(`cbd_pager_${tableId}`);
// 		if (oldPager) oldPager.remove();

// 		const allRows = () => [...tbody.querySelectorAll('tr.cbd-dt__row')];
// 		let currentPage = 1;

// 		const render = () => {
// 			const rows = allRows();
// 			const total = rows.length;
// 			if (total <= pageSize) {
// 				rows.forEach(r => r.style.display = '');
// 				return; // No pager needed
// 			}
// 			const totalPages = Math.ceil(total / pageSize);
// 			currentPage = Math.max(1, Math.min(currentPage, totalPages));
// 			const s = (currentPage-1)*pageSize, e = s+pageSize;
// 			rows.forEach((r, i) => {
// 				const visible = (i >= s && i < e);
// 				r.dataset.paginationHidden = visible ? '' : '1';
// 				// Only show if not search-hidden
// 				if (!visible) r.style.display = 'none';
// 				else if (r.getAttribute('data-search-hidden') !== '1') r.style.display = '';
// 			});
// 			// Update pager UI
// 			const pager = document.getElementById(`cbd_pager_${tableId}`);
// 			if (pager) {
// 				pager.querySelector('.cbd-pager__info').textContent =
// 					`Showing ${s+1}–${Math.min(e,total)} of ${total} records`;
// 				pager.querySelector('.cbd-pager__prev').disabled = currentPage <= 1;
// 				pager.querySelector('.cbd-pager__next').disabled = currentPage >= totalPages;
// 				pager.querySelector('.cbd-pager__page').textContent = `Page ${currentPage} of ${totalPages}`;
// 			}
// 		};

// 		if (allRows().length <= pageSize) { render(); return; }

// 		// Insert pager after the table
// 		const pager = document.createElement('div');
// 		pager.id = `cbd_pager_${tableId}`;
// 		pager.className = 'cbd-pager';
// 		pager.innerHTML = `
// 			<div class="cbd-pager__left">
// 				<button class="cbd-pager__btn cbd-pager__prev">‹ Prev</button>
// 				<span class="cbd-pager__page"></span>
// 				<button class="cbd-pager__btn cbd-pager__next">Next ›</button>
// 			</div>
// 			<span class="cbd-pager__info"></span>`;
// 		// Insert after table (within same tbl-wrap)
// 		const wrap = table.closest('.cbd-dm__tbl-wrap') || table.parentNode;
// 		wrap.appendChild(pager);

// 		pager.querySelector('.cbd-pager__prev').addEventListener('click', () => {
// 			if (currentPage > 1) { currentPage--; render(); }
// 		});
// 		pager.querySelector('.cbd-pager__next').addEventListener('click', () => {
// 			const rows = allRows();
// 			if (currentPage < Math.ceil(rows.length/pageSize)) { currentPage++; render(); }
// 		});

// 		// Store context for sort to call
// 		table._pagerCtx = { currentPage: 1, render };
// 		render();
// 	}

// 	_fmt(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v = parseFloat(n) || 0;
// 		const abs = Math.abs(v);
// 		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
// 		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
// 		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
// 		return '₹' + Math.round(v).toLocaleString('en-IN');
// 	}

// 	_fmtFull(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v = parseFloat(n) || 0;
// 		return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// 	}

// 	_fmtCr(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v   = parseFloat(n) || 0;
// 		const abs = Math.abs(v);
// 		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
// 		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
// 		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
// 		return '₹' + Math.round(v).toLocaleString('en-IN');
// 	}

// 	_fmtTip(n, label = 'Amount') {
// 		if (n === null || n === undefined || n === '') return '<span>—</span>';
// 		const v       = parseFloat(n) || 0;
// 		const short   = this._fmt(v);
// 		const full    = this._fmtFull(v);
// 		const tipText = label ? `${label}\n${full}` : full;
// 		const negStyle = v < 0 ? 'color:#dc2626;' : '';
// 		// data-raw stores the exact numeric value for export
// 		return `<span class="cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}"
// 			data-raw="${v}" style="cursor:default;border-bottom:1px dotted #94a3b8;${negStyle}">${short}</span>`;
// 	}

// 	_fmtCard(n, label = '') {
// 		if (n === null || n === undefined || n === '') return '<span class="cbd-scard__num-val">—</span>';
// 		const v       = parseFloat(n) || 0;
// 		const display = this._fmtCr(v);
// 		const full    = this._fmtFull(v);
// 		// Show negative indicator for over-utilized / excess bank states
// 		const negStyle = v < 0 ? 'color:#dc2626' : '';
// 		const tipText = label ? `${label}\n${full}` : full;
// 		return `<span class="cbd-scard__num-val cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}"
// 			style="cursor:default;${negStyle}">${display}</span>`;
// 	}

// 	_date(d){ if(!d)return'—'; return frappe.datetime.str_to_user(d)||d; }

// 	_metric(label,value,rawNum=null){
// 		const display = rawNum!==null ? this._fmtTip(rawNum, label) : value;
// 		return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${display}</span></div>`;
// 	}
// 	_metric_pct(label,pct){
// 		const v=parseFloat(pct)||0; const cls=v>=80?'green':v>=50?'amber':'red';
// 		return `<div class="cbd-metric cbd-metric--pct"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value cbd-metric__pct cbd-metric__pct--${cls}">${v.toFixed(1)}%</span></div>`;
// 	}
// 	_fill_cls(v){return v>=80?'green':v>=50?'amber':'red';}
// 	_chip_cls(v){return v>=80?'green':v>=50?'amber':'red';}
// 	_badge_cls(v){return v>=80?'green':v>=50?'amber':'red';}

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
// 	}

// 	_close_all_panels(){this._close_panels();this._close_disb_panel();}
// 	_close_panels(){
// 		const overlay=document.getElementById('cbd_overlay');
// 		const left=document.getElementById('cbd_panel_left');
// 		const right=document.getElementById('cbd_panel_right');
// 		if(overlay)overlay.classList.remove('cbd-overlay--active');
// 		if(left){left.classList.remove('cbd-panel--open','cbd-panel--full');}
// 		if(right){right.classList.remove('cbd-panel--open','cbd-panel--full');}
// 		document.body.classList.remove('cbd-panels-open');
// 	}
// 	_close_disb_panel(){
// 		const panel=document.getElementById('cbd_disb_modal');
// 		const overlay=document.getElementById('cbd_disb_overlay');
// 		if(panel)panel.classList.remove('cbd-disb-modal--open');
// 		if(overlay)overlay.classList.remove('cbd-disb-overlay--active');
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
// 		.cbd-filter-col { flex:1 1 0; min-width:160px; padding:8px 8px 0; box-sizing:border-box; }

// 		/* ── Section labels ── */
// 		.cbd-section-hd { display:flex; align-items:center; gap:10px; margin:0 0 10px; }
// 		.cbd-section-hd__line { flex:1; height:1px; background:#e8edf3; }
// 		.cbd-section-hd__label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#a0aec0; white-space:nowrap; flex-shrink:0; }

// 		/* ── Overview strip ── */
// 		.cbd-overview-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin-bottom:12px; }

// 		/* ── Summary cards — 4-col + 8 cards wrap ── */
// 		.cbd-summary-cards { display:grid; grid-template-columns:repeat(5,1fr); gap:5px; margin-bottom:6px; }

// 		/* ── Shared card base ── */
// 		.cbd-ostat, .cbd-scard {
// 			background:#fff; border:1px solid #e8edf3; border-left:4px solid #1e3a5f;
// 			border-radius:10px; min-width:0; word-break:break-word; transition:box-shadow .2s;
// 		}
// 		.cbd-scard { padding:8px 8px 7px; min-height:88px; display:flex; flex-direction:column; cursor:pointer; }
// 		.cbd-ostat { padding:11px 12px 10px; position:relative; display:flex; align-items:center; gap:10px; }
// 		.cbd-ostat--clickable { cursor:pointer; }
// 		.cbd-ostat:hover, .cbd-scard:hover { box-shadow:0 4px 18px rgba(0,0,0,.09); }
// 		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
// 		.cbd-ostat__arrow { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:var(--card-accent,#378ADD); opacity:0; transition:opacity .15s; }
// 		.cbd-ostat__icon { width:32px; height:32px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:7px; background:var(--ost-ibg,#EEF2FF); color:var(--card-accent,#378ADD); }
// 		.cbd-ostat__icon svg { width:16px; height:16px; }
// 		.cbd-ostat__body { min-width:0; flex:1; }
// 		.cbd-ostat__value { font-size:17px; font-weight:800; color:#1a202c; line-height:1.1; margin-bottom:1px; }
// 		.cbd-ostat__label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.55px; color:#8492a6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

// 		.cbd-scard__lbl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.55px; color:#8492a6; margin-bottom:5px; }
// 		.cbd-scard__num { font-size:18px; font-weight:800; color:#1a202c; line-height:1.1; margin-bottom:3px; letter-spacing:-.3px; }
// 		.cbd-scard__num-val { display:inline; }
// 		.cbd-scard__sub { font-size:12px; font-weight:500; color:#64748b; line-height:1.3; margin-bottom:5px; }
// 		.cbd-scard__pct-badge { display:inline-block; padding:2px 7px; border-radius:7px; font-size:12px; font-weight:800; margin-right:2px; }
// 		.cbd-scard__cta { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:700; letter-spacing:.3px; text-transform:uppercase; color:var(--card-accent,#378ADD); margin-top:auto; }

// 		/* ── Alert component ── */
// 		.cbd-alert { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; margin-bottom:14px; border-radius:8px; border:1px solid transparent; animation:cbd-slide-in .3s ease; }
// 		@keyframes cbd-slide-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
// 		.cbd-alert--warning { background:#fffbeb; border-color:#fde68a; border-left:4px solid #f59e0b; }
// 		.cbd-alert--warning .cbd-alert__icon { color:#d97706; }
// 		.cbd-alert--warning .cbd-alert__title { color:#92400e; }
// 		.cbd-alert--warning .cbd-alert__msg { color:#78350f; }
// 		.cbd-alert--danger { background:#fef2f2; border-color:#fecaca; border-left:4px solid #dc2626; }
// 		.cbd-alert--danger .cbd-alert__icon { color:#dc2626; }
// 		.cbd-alert--danger .cbd-alert__title { color:#7f1d1d; }
// 		.cbd-alert--danger .cbd-alert__msg { color:#991b1b; }
// 		.cbd-alert--success { background:#f0fdf4; border-color:#bbf7d0; border-left:4px solid #16a34a; }
// 		.cbd-alert--success .cbd-alert__icon { color:#16a34a; }
// 		.cbd-alert--success .cbd-alert__title { color:#14532d; }
// 		.cbd-alert--success .cbd-alert__msg { color:#166534; }
// 		.cbd-alert__icon { flex-shrink:0; margin-top:1px; }
// 		.cbd-alert__body { flex:1; min-width:0; }
// 		.cbd-alert__title { display:block; font-size:12px; font-weight:700; margin-bottom:2px; }
// 		.cbd-alert__msg { display:block; font-size:12px; }
// 		.cbd-alert__dismiss { flex-shrink:0; background:none; border:none; cursor:pointer; padding:2px; border-radius:4px; opacity:.7; }
// 		.cbd-alert__dismiss:hover { opacity:1; background:rgba(0,0,0,.06); }

// 		/* Frappe alerts must appear above our modals (z-index 3200) */
// 		/* Frappe alerts/toasts must appear ABOVE our modals (z-index 3200) */
// 		.frappe-alert, .frappe-alert-container,
// 		.alert-container, .alert-message,
// 		.toast-container, .frappe-toast-area,
// 		.frappe-toast, .notification-container,
// 		[class*="toast"], [class*="frappe-alert"] { z-index:99999 !important; }

// 		/* ── Chart card ── */
// 		.cbd-chart-card { background:#fff; border:1px solid #e8edf3; border-radius:12px; padding:18px 22px 18px; margin-bottom:16px; box-shadow:0 1px 3px rgba(15,23,42,.04); }
// 		.cbd-chart-card__legend { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
// 		.cbd-chart-legend__items { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
// 		.cbd-chart-legend__item { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:#334155; }
// 		.cbd-chart-legend__period { font-size:11px; font-weight:700; color:#1e3a5f; background:#eef4fd; border:1px solid #d3e3f8; border-radius:20px; padding:4px 12px; white-space:nowrap; }
// 		.cbd-chart-card__body { width:100%; }
// 		.cbd-donut__grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px; }
// 		.cbd-donut__panel { border:1px solid #eef2f7; border-radius:10px; padding:14px 16px; }
// 		.cbd-donut__panel-title { font-size:11.5px; font-weight:700; color:#475569; margin-bottom:10px; }
// 		.cbd-donut { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
// 		.cbd-donut__chart { position:relative; flex-shrink:0; width:140px; height:140px; }
// 		.cbd-donut__seg { transition:opacity .12s; }
// 		.cbd-donut__seg:hover { opacity:.82; }
// 		.cbd-donut__center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
// 		.cbd-donut__center-pct { font-size:21px; font-weight:800; color:#0f172a; line-height:1; }
// 		.cbd-donut__center-lbl { font-size:8.5px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.4px; margin-top:2px; }
// 		.cbd-donut__legend { flex:1; min-width:130px; display:flex; flex-direction:column; gap:6px; }
// 		.cbd-donut__row { cursor:pointer; display:flex; align-items:center; gap:8px; padding:5px 6px; border-radius:6px; transition:background .12s; }
// 		.cbd-donut__row:hover { background:#f8fafc; }
// 		.cbd-donut__dot { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
// 		.cbd-donut__row-lbl { font-size:11px; font-weight:600; color:#334155; flex:1; line-height:1.3; }
// 		.cbd-donut__row-val { font-size:11px; font-weight:700; color:#0f172a; white-space:nowrap; }
// 		.cbd-donut__empty { font-size:11px; color:#cbd5e1; font-style:italic; }
// 		.cbd-donut__overflow { margin-top:10px; font-size:10.5px; font-weight:600; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:5px 8px; }

// 		/* ── CHANGE #2: Wider ostat drill popup ── */
// 		.cbd-drill-modal-wrap { position:fixed; inset:0; z-index:3200; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; transition:background .2s ease; pointer-events:none; }
// 		.cbd-drill-modal-wrap--open { background:rgba(0,0,0,.45); pointer-events:all; }
// 		.cbd-drill-modal { background:var(--card-bg,#fff); border-radius:12px; border:1px solid var(--border-color,#d1d8dd); box-shadow:0 8px 40px rgba(0,0,0,.18); display:flex; flex-direction:column; max-height:80vh; width:100%; opacity:0; transform:scale(.96) translateY(8px); transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1); overflow:hidden; }
// 		.cbd-drill-modal-wrap--open .cbd-drill-modal { opacity:1; transform:scale(1) translateY(0); }
// 		/* CHANGE #2: --narrow is now 600px instead of 400px */
// 		.cbd-drill-modal--narrow { max-width:600px; }
// 		.cbd-drill-modal--wide   { max-width:760px; }
// 		.cbd-drill-modal--full   { max-width:min(960px,97vw); max-height:97vh; }
// 		.cbd-drill-modal--wide   { max-width:640px; }
// 		@media (max-width:640px) { .cbd-drill-modal-wrap { align-items:flex-end; padding:0; } .cbd-drill-modal { border-radius:16px 16px 0 0; max-width:100vw; max-height:85vh; transform:translateY(20px); } .cbd-drill-modal-wrap--open .cbd-drill-modal { transform:translateY(0); } }
// 		.cbd-drill-modal__header { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 14px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
// 		.cbd-drill-modal__searchbar { padding:10px 18px; background:#f8fafc; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
// 		.cbd-drill-modal__searchbar .cbd-dm__search-input { width:220px; }
// 		.cbd-drill-modal__header-left { display:flex; align-items:center; gap:12px; min-width:0; }
// 		.cbd-drill-modal__icon { width:38px; height:38px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#EEF5FC; color:#378ADD; }
// 		.cbd-drill-modal__title { font-size:15px; font-weight:700; color:var(--text-color,#1c2126); }
// 		.cbd-drill-modal__sub { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-drill-modal__close { width:30px; height:30px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; background:none; cursor:pointer; color:var(--text-muted,#8d99a6); transition:background .12s, color .12s; }
// 		.cbd-drill-modal__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
// 		.cbd-drill-modal__body { flex:1; overflow-y:auto; padding:0; }
// 		.cbd-drill-modal__body::-webkit-scrollbar { width:4px; }
// 		.cbd-drill-modal__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
// 		.cbd-drill-modal__footer { display:flex; justify-content:flex-end; align-items:center; padding:10px 18px; border-top:1px solid var(--border-color,#d1d8dd); flex-shrink:0; background:var(--control-bg,#f9f9f9); }

// 		/* ── Drill tables (dt2) ── */
// 		.cbd-dt2 { width:100%; border-collapse:collapse; font-size:13px; }
// 		.cbd-dt2 thead tr { background:var(--dt2-hdr,#4F46E5); }
// 		.cbd-dt2 .cbd-dt2__th-num,.cbd-dt2 .cbd-dt2__th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--dt2-hdr-text,#fff); border:1px solid rgba(255,255,255,.2); white-space:nowrap; }
// 		.cbd-dt2 .cbd-dt2__th--r { text-align:right; }
// 		.cbd-dt2 .cbd-dt2__th-num { width:42px; text-align:center; }
// 		.cbd-dt2 tbody tr:hover td { background:#f7f9fc; }
// 		.cbd-dt2 tbody tr:nth-child(even) td { background:#fafafa; }
// 		.cbd-dt2__num { text-align:center; font-size:11px; font-weight:700; border:1px solid var(--border-color,#d1d8dd); padding:8px 6px; }
// 		.cbd-dt2__cell { padding:9px 12px; font-size:13px; font-weight:500; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-dt2__badge-cell { padding:7px 12px; text-align:right; border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-dt2__pill { display:inline-flex; align-items:center; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:700; border:1px solid; }

// 		/* ── Accent modifiers ── */
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

// 		/* ── Budget modal ── */
// 		.cbd-bm__modal { overflow:hidden; max-width:720px; display:flex; flex-direction:column; }
// 		.cbd-bm__modal .cbd-bm__viewport { display:flex; width:200%; flex:1; transition:transform .28s cubic-bezier(.4,0,.2,1); }
// 		.cbd-bm__modal--detail .cbd-bm__viewport { transform:translateX(-50%); }
// 		.cbd-bm__page { width:50%; flex-shrink:0; display:flex; flex-direction:column; overflow:hidden; min-height:200px; }
// 		.cbd-bm__body { flex:1; overflow-y:auto; }
// 		.cbd-bm__topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; border-bottom:1px solid #e5e7eb; flex-shrink:0; background:#fff; }
// 		.cbd-bm__close { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color,#d1d8dd); border-radius:6px; background:none; cursor:pointer; color:var(--text-muted,#8d99a6); transition:background .12s, color .12s; }
// 		.cbd-bm__close:hover { background:#FCEBEB; color:#A32D2D; }

// 		/* ── Breadcrumb ── */
// 		.cbd-bc { display:flex; align-items:center; gap:4px; min-width:0; flex:1; }
// 		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-bc__item--root,.cbd-bc__item--active { font-weight:700; color:#111827; }
// 		.cbd-bc__item--link { background:none; border:none; padding:0; cursor:pointer; color:#4F46E5; font-weight:500; font-size:13px; transition:color .12s; white-space:nowrap; }
// 		.cbd-bc__item--link:hover { color:#3730A3; text-decoration:underline; }
// 		.cbd-bc__sep { color:#d1d5db; font-size:15px; line-height:1; flex-shrink:0; }

// 		/* ── Simple table (st) ── */
// 		.cbd-st { width:100%; border-collapse:collapse; font-size:13px; }
// 		.cbd-st th,.cbd-st td { border:1px solid #e5e7eb; padding:9px 12px; }
// 		.cbd-st__th { text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; background:#f9fafb; }
// 		.cbd-st__th--num { width:44px; text-align:center; }
// 		.cbd-st__th--r { text-align:right; }
// 		.cbd-st__num { text-align:center; color:var(--text-muted,#8d99a6); font-size:12px; background:var(--control-bg,#fafafa); }
// 		.cbd-st__cell { color:var(--text-color,#1c2126); }
// 		.cbd-st__r { text-align:right; font-weight:600; }
// 		.cbd-st__foot { background:#f9fafb; color:#374151; font-weight:600; font-size:13px; border-top:1px solid #e5e7eb !important; }
// 		.cbd-st tbody tr:hover td { background:#f9fafb; }
// 		.cbd-st__action { text-align:center; }
// 		.cbd-st__drill-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; font-size:11px; font-weight:600; color:#4F46E5; background:#EEF2FF; border:1px solid #c7d2fe; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .12s; }
// 		.cbd-st__drill-btn:hover { background:#e0e7ff; }

// 		/* ── sm modal wrap ── */
// 		.cbd-sm-wrap { position:fixed; inset:0; z-index:3100; background:rgba(0,0,0,0); display:flex; align-items:flex-start; justify-content:center; padding:0; box-sizing:border-box; overflow-y:auto; transition:background .2s ease; pointer-events:none; }
// 		.cbd-sm-wrap--open { background:rgba(0,0,0,.4); pointer-events:all; }
// 		.cbd-sm-modal { background:#fff; width:auto; min-width:440px; max-width:min(95vw,820px); margin:40px auto; border-radius:10px; border:1px solid #e5e7eb; box-shadow:0 8px 32px rgba(0,0,0,.12); display:flex; flex-direction:column; max-height:calc(100vh - 80px); opacity:0; transform:translateY(12px); transition:opacity .2s ease, transform .2s ease; overflow:hidden; }
// 		.cbd-sm-wrap--open .cbd-sm-modal { opacity:1; transform:translateY(0); }

// 		/* ── Universal Drill Modal (dw) ── */
// 		.cbd-dw { position:fixed; inset:0; z-index:3200; background:rgba(0,0,0,0); display:flex; align-items:flex-start; justify-content:center; padding:0; overflow-y:auto; box-sizing:border-box; transition:background .2s ease; pointer-events:none; }
// 		.cbd-dw--open { background:rgba(0,0,0,.45); pointer-events:all; }
// 		.cbd-dm { background:#fff; width:min(99vw, 1380px); margin:14px auto; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 24px 64px rgba(0,0,0,.20); display:flex; flex-direction:column; min-height:200px; max-height:calc(100vh - 28px); overflow:hidden; opacity:0; transform:translateY(14px); transition:opacity .2s ease, transform .2s ease; }
// 		.cbd-dw--open .cbd-dm { opacity:1; transform:translateY(0); }
// 		.cbd-dm__track { display:flex; width:300%; flex:1; transition:transform .28s cubic-bezier(.4,0,.2,1); min-height:0; }
// 		.cbd-dm__page { width:calc(100%/3); flex-shrink:0; display:flex; flex-direction:column; overflow:hidden; min-height:0; }
// 		.cbd-dm__track--2 { width:200%; }
// 		.cbd-dm__page--2 { width:50%; }
// 		.cbd-dm__topbar { display:flex; align-items:center; justify-content:space-between; padding:11px 18px; border-bottom:2px solid #e8edf3; flex-shrink:0; gap:12px; background:linear-gradient(to right,#f8fafc,#fff); }
// 		.cbd-dm__topbar-left { display:flex; align-items:center; gap:8px; min-width:0; flex:1; }
// 		.cbd-dm__back { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; font-size:12px; font-weight:600; color:#374151; background:#fff; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; white-space:nowrap; flex-shrink:0; transition:background .12s; }
// 		.cbd-dm__back:hover { background:#f3f4f6; }
// 		.cbd-dm__actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
// 		.cbd-dm__body { flex:1; overflow:hidden; min-height:0; display:flex; flex-direction:column; }
// 		.cbd-dm__tbl-wrap { flex:1; overflow:auto; min-height:0; padding:10px 14px; }
// 		/* Line items page (p3): make body the scroll container for reliable sticky */
// 		.cbd-li-scrollbody { overflow:auto !important; display:block !important; flex:1; min-height:0; }
// 		.cbd-li-scrollbody .cbd-dm__tbl-wrap { overflow:visible; flex:none; padding:0; }
// 		/* Not sticky — the header row itself now sits at top:0, so the
// 		   bar can't also stick there without the two overlapping. */
// 		.cbd-li-scrollbody .cbd-li__expand-bar { position:static; height:32px; box-sizing:border-box; }
// 		.cbd-li-scrollbody .cbd-dt thead th { position:sticky; top:0; z-index:9; background:#dbeafe; }
// 		.cbd-li-scrollbody .cbd-dt tfoot { position:static; z-index:auto; }
// 		/* ── FIX ──
// 		   Grouped line-item tables previously had TWO independent sticky
// 		   layers stacked on each other: the <thead> element itself
// 		   (position:sticky; top:0; z-index:3 — from the base .cbd-dt rule
// 		   further down) AND its <th> cells individually (top:32px;
// 		   z-index:9 — above). Sticky positioning on a <thead> as a whole
// 		   is not part of any table-layout spec and behaves inconsistently
// 		   across browsers (each browser decides differently what box the
// 		   sticky offset applies to), which caused two different bugs
// 		   depending on the thead's z-index:
// 		     - z-index:3 (original): the thead's own box painted OVER the
// 		       first group-divider row sitting right beneath it, making
// 		       that row appear to vanish.
// 		     - z-index:-1 (an attempted fix): the thead's box — and
// 		       everything rendered inside it, including the header text —
// 		       got pushed BEHIND the table body instead, so the header
// 		       row appeared blank/empty even though its <th> cells still
// 		       contained "Expense Type", "Sub Head", etc.
// 		   The correct, standards-safe pattern is to make ONLY the <th>
// 		   cells sticky and leave the <thead> itself in normal flow —
// 		   sticky positioning resolves against the nearest scrolling
// 		   ancestor (.cbd-li-scrollbody here), not the nearest positioned
// 		   ancestor, so the <thead> does not need to be sticky itself for
// 		   its <th> children to stick correctly. Each <th> now also carries
// 		   its own background so it still fully covers whatever scrolls
// 		   beneath it. This is scoped to .cbd-li-scrollbody only, so the
// 		   sticky header behavior of every other (non-grouped) .cbd-dt
// 		   table elsewhere in the dashboard is unaffected. */
// 		.cbd-li-scrollbody .cbd-dt thead { position:static; z-index:auto; background:none; }
// 		/* Sticky '#' and 'Expense Type' columns for the month-wise line-item
// 		   tables (they can have many month columns needing horizontal
// 		   scroll, and many rows needing vertical scroll — this keeps you
// 		   oriented on both axes). */
// 		.cbd-dt--grouped .cbd-li__sticky-num,
// 		.cbd-dt--grouped .cbd-li__sticky-exp { position:sticky; z-index:4; }
// 		.cbd-dt--grouped .cbd-li__sticky-num { left:0; }
// 		.cbd-dt--grouped .cbd-li__sticky-exp { left:44px; }
// 		.cbd-dt--grouped thead .cbd-li__sticky-num,
// 		.cbd-dt--grouped thead .cbd-li__sticky-exp { z-index:11; }
// 		.cbd-dm__tbl-wrap::-webkit-scrollbar { width:5px; height:5px; }
// 		.cbd-dm__tbl-wrap::-webkit-scrollbar-thumb { background:#94a3b8; border-radius:3px; }
// 		.cbd-dm__loading { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }
// 		.cbd-dm__empty { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }
// 		.cbd-dm__close { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; flex-shrink:0; border:1px solid #e2e8f0; border-radius:7px; background:#fff; cursor:pointer; color:#64748b; transition:background .12s, color .12s; }
// 		.cbd-dm__close:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }
// 		.cbd-dm__search { display:flex; align-items:center; gap:6px; padding:0 10px; height:30px; border:1px solid #e2e8f0; border-radius:7px; background:#f8fafc; color:#94a3b8; transition:border-color .12s; }
// 		.cbd-dm__search:focus-within { border-color:#93c5fd; background:#fff; }
// 		.cbd-dm__search-input { border:none; background:none; outline:none; font-size:12px; color:#1e293b; width:130px; }
// 		.cbd-dm__search-input::placeholder { color:#94a3b8; }

// 		/* ── Export dropdown ── */
// 		.cbd-exp-dd { position:relative; flex-shrink:0; }
// 		.cbd-exp-btn--main { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; font-size:12px; font-weight:600; color:#1e3a5f; background:#e8f0fe; border:1px solid #93c5fd; border-radius:7px; cursor:pointer; transition:background .12s; }
// 		.cbd-exp-btn--main:hover { background:#dbeafe; }
// 		.cbd-exp-dd__menu { position:absolute; top:calc(100% + 4px); right:0; min-width:160px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.12); opacity:0; visibility:hidden; transform:translateY(-4px); transition:opacity .12s, transform .12s, visibility .12s; z-index:20; overflow:hidden; padding:4px; }
// 		.cbd-exp-dd--open .cbd-exp-dd__menu { opacity:1; visibility:visible; transform:translateY(0); }
// 		.cbd-exp-dd__item { display:flex; align-items:center; gap:8px; width:100%; padding:8px 10px; font-size:12px; font-weight:500; text-align:left; color:#334155; background:none; border:none; border-radius:6px; cursor:pointer; transition:background .1s; }
// 		.cbd-exp-dd__item:hover { background:#f1f5f9; }

// 		/* ── Drill-down table (dt) ── */
// 		.cbd-dt { width:100%; border-collapse:collapse; font-size:13px; white-space:nowrap; border:1px solid #cbd5e1; }
// 		.cbd-dt thead { position:sticky; top:0; z-index:3; background:#dbeafe; }
// 		.cbd-dt tfoot { position:static; background:#bfdbfe; }
// 		/* Ensure sticky works inside tbl-wrap scroll container */
// 		.cbd-dm__tbl-wrap { position:relative; }
// 		.cbd-dt th { padding:10px 14px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#1e3a5f; background:#dbeafe; border:1px solid #93c5fd; }
// 		.cbd-dt td { padding:9px 14px; border:1px solid #e2e8f0; vertical-align:middle; color:#334155; background:#fff; }
// 		.cbd-dt__th--num { width:44px; text-align:center; }
// 		.cbd-dt__th--r { text-align:right; }
// 		.cbd-dt__row:hover td { background:#eff6ff !important; transition:background .08s; }
// 		.cbd-dt__num { text-align:center; color:#64748b; font-size:11px; width:44px; font-weight:600; background:#f8fafc; }
// 		.cbd-dt__name { color:#0f172a; font-weight:500; }
// 		.cbd-dt__r { text-align:right; font-weight:700; color:#0f172a; }
// 		.cbd-dt__pct { font-weight:800; }
// 		.cbd-dt__act { text-align:center; }
// 		/* CHANGE #9: indented child row number and cell */
// 		.cbd-dt__indent-num { padding-left:22px !important; }
// 		.cbd-dt__cell-indent { padding-left:22px !important; }
// 		.cbd-dt tfoot tr td,.cbd-dt__foot { padding:10px 14px; font-weight:800; font-size:13px; color:#1e3a5f; background:#bfdbfe !important; border:1px solid #93c5fd !important; }
// 		.cbd-dt__btn { display:inline-flex; align-items:center; gap:4px; padding:4px 12px; font-size:11px; font-weight:600; color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd; border-radius:6px; cursor:pointer; transition:all .12s; }
// 		.cbd-dt__btn:hover { background:#dbeafe; }
// 		.cbd-dt__btn:disabled { opacity:.4; cursor:not-allowed; }
// 		.cbd-dm__consolidated-btn { display:flex; width:fit-content; font-weight:700; }

// 		/* ── Line item section dividers ── */
// 		.cbd-dt--grouped { table-layout:auto; }
// 		.cbd-grp__header-row { background:#f1f5f9 !important; cursor:pointer; }
// 		.cbd-grp__header-row:hover { background:#e2e8f0 !important; }
// 		.cbd-grp__header-row:hover td { background:#e2e8f0 !important; }
// 		.cbd-grp__header-row td { background:#f1f5f9 !important; border:1px solid #dbe3ea !important; padding:8px 14px !important; transition:background .12s; }
// 		/* ── FIX ──
// 		   Main-head divider rows ("Annual Recurring operating cost" etc)
// 		   are sticky again — they were temporarily disabled while tracking
// 		   down an overlap bug, but that bug's real cause was the <thead>
// 		   ELEMENT ITSELF being sticky at the same time as its <th> cells
// 		   (fixed above: the <thead> is now position:static). With that
// 		   root cause gone, a shared sticky offset across every group row
// 		   behaves like the standard "sticky section header" pattern: the
// 		   current group's title stays pinned just below the column
// 		   header, and the next group's title pushes it out as you scroll
// 		   past — it does not hide/overlap other groups. The actual top
// 		   offset (bar height + header height) is written in as an inline
// 		   style by _sync_li_header_offset() so it always matches the
// 		   real, current header height instead of a guessed constant. */
// 		.cbd-li-scrollbody .cbd-grp__header-row td { position:sticky; z-index:6; }
// 		.cbd-grp__header { display:flex; align-items:center; gap:10px; }
// 		.cbd-grp__chevron { flex-shrink:0; color:#64748b; transition:transform .15s ease; }
// 		.cbd-grp__header-row--collapsed .cbd-grp__chevron { transform:rotate(-90deg); }
// 		.cbd-grp__title { font-weight:700; color:#1e293b; font-size:12.5px; }
// 		.cbd-grp__count { font-size:10.5px; font-weight:600; color:#94a3b8; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:1px 8px; }
// 		.cbd-grp__subtotal { margin-left:auto; font-weight:800; color:#0f172a; font-size:12.5px; }
// 		/* Collapse toggles: hide month columns and/or individual line items */
// 		.cbd-dt--grouped.cbd-li-months-collapsed .cbd-li__month-col { display:none; }
// 		.cbd-dt--grouped.cbd-li-items-collapsed .cbd-grp__child-row { display:none; }

// 		/* ── Pending utilization date bar ── */
// 		.cbd-pu__datebar { padding:12px 18px 8px; border-bottom:1px solid #eef2f7; background:#f8fafc; }
// 		.cbd-pu__datebar-inner { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
// 		.cbd-pu__datelbl { font-size:11px; font-weight:700; color:#475569; white-space:nowrap; }
// 		.cbd-pu__datelbl-hint { font-weight:400; color:#94a3b8; font-style:italic; }
// 		.cbd-pu__date-ctrl-wrap { min-width:180px; max-width:220px; }
// 		.cbd-pu__date-ctrl-wrap .frappe-control { margin-bottom:0 !important; }
// 		.cbd-pu__date-ctrl-wrap .control-label { display:none !important; }
// 		.cbd-pu__dateinfo { font-size:11px; color:#64748b; padding-top:4px; font-style:italic; }
// 		.cbd-pu__month-chip { display:inline-block; font-size:10px; font-weight:600; color:#9a3412; background:#ffedd5; border:1px solid #fed7aa; border-radius:12px; padding:2px 8px; margin:1px 3px 1px 0; white-space:nowrap; }
// 		.cbd-pu__months-cell { max-height:64px; overflow-y:auto; overflow-x:hidden; white-space:normal; padding:2px 2px 2px 0; }
// 		.cbd-pu__months-cell::-webkit-scrollbar { width:4px; }
// 		.cbd-pu__months-cell::-webkit-scrollbar-thumb { background:#fca5a5; border-radius:2px; }
// 		.cbd-pu__month-chip--more { color:#475569; background:#f1f5f9; border-color:#e2e8f0; }
// 		.cbd-pu__no-email { color:#cbd5e1; font-style:italic; font-size:12px; }
// 		.cbd-pu__msgbar { padding:10px 18px; border-bottom:1px solid #eef2f7; background:#f8fafc; }
// 		.cbd-pu__msglbl { display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:5px; }
// 		.cbd-pu__msglbl-opt { font-weight:500; color:#94a3b8; text-transform:none; letter-spacing:0; }
// 		.cbd-pu__msgbox { width:100%; resize:vertical; min-height:42px; font-size:12.5px; font-family:inherit; color:#1e293b; border:1px solid #e2e8f0; border-radius:7px; padding:8px 10px; background:#fff; transition:border-color .12s; }
// 		.cbd-pu__msgbox:focus { outline:none; border-color:#93c5fd; }

// 		/* ── Tooltip ── */
// 		.cbd-tip-wrap { border-bottom:1px dashed #94a3b8; cursor:default; }
// 		#cbd-global-tip { position:fixed; z-index:9999; pointer-events:none; background:#1A1D23; border:1px solid rgba(255,255,255,.10); color:#fff; border-radius:10px; font-family:inherit; box-shadow:0 12px 32px rgba(0,0,0,.30); opacity:0; transform:translateY(8px) scale(.96); transition:opacity .16s ease, transform .2s cubic-bezier(.22,1,.36,1); min-width:150px; max-width:260px; overflow:hidden; padding:0; }
// 		#cbd-global-tip .cbd-tip__header { padding:7px 12px 5px; border-bottom:1px solid rgba(255,255,255,.08); display:flex; align-items:center; gap:6px; }
// 		#cbd-global-tip .cbd-tip__icon { width:16px; height:16px; border-radius:4px; background:rgba(55,138,221,.25); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
// 		#cbd-global-tip .cbd-tip__label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.7px; color:rgba(255,255,255,.50); }
// 		#cbd-global-tip .cbd-tip__body { padding:6px 12px 10px; }
// 		#cbd-global-tip .cbd-tip__amount { font-size:16px; font-weight:700; letter-spacing:.3px; color:#fff; display:block; }
// 		#cbd-global-tip .cbd-tip__hint { font-size:10px; color:rgba(255,255,255,.35); margin-top:2px; display:block; }
// 		#cbd-global-tip::after { content:''; position:absolute; left:50%; transform:translateX(-50%); bottom:-6px; border:6px solid transparent; border-bottom:none; border-top-color:#1A1D23; }
// 		#cbd-global-tip.cbd-tip--visible { opacity:1; transform:translateY(0) scale(1); }
// 		#cbd-global-tip.cbd-tip--below::after { bottom:auto; top:-6px; border-top:none; border-bottom:6px solid #1A1D23; }

// 		/* ── Responsive ── */
		
// 				/* ── Analytics Charts ─────────────────────────────────────────── */
// 		.cbd-analytics-section { border-top:1px solid var(--border-color,#e5e7eb); }
// 		.cbd-chart-card {
// 			background:#fff; border:1px solid #e5e7eb; border-radius:14px;
// 			padding:16px; box-shadow:0 1px 4px rgba(0,0,0,.05);
// 		}
// 		.cbd-chart-card__title {
// 			display:flex; align-items:center; gap:6px;
// 			font-size:13px; font-weight:700; color:#111827;
// 		}
// 		.cbd-chart-card__sub {
// 			font-size:11px; color:#9ca3af; margin-top:2px;
// 		}

// 				/* ── Geo Map: panel sizing for districts/blocks ── */
// 		.cbd-stat-panel.cbd-geo-wide { max-width:580px; width:92vw; max-height:88vh; }
// 		@keyframes cbd-spin { to { transform:rotate(360deg); } }

// 				/* ── Line item count bar ── */
// 		.cbd-li__expand-bar {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:8px 16px; background:#f0f9ff; border-bottom:1px solid #bae6fd;
// 			gap:12px; flex-shrink:0; flex-wrap:wrap;
// 		}
// 		.cbd-li__expand-hint { font-size:11px; color:#94a3b8; margin-right:auto; }
// 		.cbd-li__toggle { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:#1e3a5f; cursor:pointer; user-select:none; white-space:nowrap; }
// 		.cbd-li__toggle input { width:14px; height:14px; accent-color:#0369a1; cursor:pointer; }

// 		/* ── Pagination ── */
// 		.cbd-pager { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; background:#f8fafc; border-top:1px solid #e2e8f0; flex-shrink:0; gap:10px; }
// 		.cbd-pager__left { display:flex; align-items:center; gap:8px; }
// 		.cbd-pager__btn { display:inline-flex; align-items:center; padding:4px 12px; font-size:12px; font-weight:600; color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd; border-radius:6px; cursor:pointer; transition:background .12s; }
// 		.cbd-pager__btn:hover:not(:disabled) { background:#dbeafe; }
// 		.cbd-pager__btn:disabled { opacity:.4; cursor:not-allowed; }
// 		.cbd-pager__page { font-size:11px; font-weight:600; color:#475569; }
// 		.cbd-pager__info { font-size:11px; color:#6b7280; }

// 		/* ── Sort icon ── */
// 		.cbd-sort-icon { font-size:10px; color:#94a3b8; vertical-align:middle; }
// 		thead th:hover .cbd-sort-icon { color:#2563eb; }

// 		/* ── Pending util filter bar ── */
// 		.cbd-pu__filterbar {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:10px 18px; background:#f0f7ff; border-bottom:1px solid #dbeafe;
// 			gap:12px; flex-shrink:0; flex-wrap:wrap;
// 		}
// 		.cbd-pu__filterbar-left { display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; min-width:0; }
// 		.cbd-pu__ctrl-wrap { min-width:130px; }
// 		.cbd-pu__ctrl-wrap .control-label { display:none !important; }
// 		.cbd-pu__ctrl-wrap .frappe-control { margin-bottom:0 !important; }

// 		/* ── Table horizontal scroll fix ── */
// 		.cbd-dm__tbl-wrap { overflow:auto !important; }
// 		.cbd-dm__tbl-wrap table { min-width:max-content; }

// 		/* ── Action column buttons: side by side ── */
// 		.cbd-dt__act-stack { display:flex; flex-direction:column; gap:3px; min-width:90px; max-width:130px; }

// 		@media (max-width:1200px) { .cbd-summary-cards { grid-template-columns:repeat(4,1fr); } }
// 		@media (max-width:1024px) { .cbd-summary-cards { grid-template-columns:repeat(4,1fr); } .cbd-overview-strip { grid-template-columns:repeat(4,1fr); } }
// 		@media (max-width:768px) { .cbd-root { padding:8px 10px 30px; } .cbd-filter-col { flex:1 1 50%; min-width:130px; } .cbd-summary-cards { grid-template-columns:repeat(2,1fr); } .cbd-overview-strip { grid-template-columns:repeat(2,1fr); }
// 			.cbd-dm__topbar { flex-wrap:wrap; row-gap:8px; }
// 			.cbd-dm__topbar-left { flex-basis:100%; }
// 			.cbd-dm__actions { flex-basis:100%; justify-content:flex-end; flex-wrap:wrap; }
// 			.cbd-dm__search-input { width:110px; }
// 			.cbd-drill-modal__searchbar .cbd-dm__search-input { width:100%; }
// 			.cbd-pu__filterbar { flex-wrap:wrap; }
// 			.cbd-pu__filterbar-left { flex-basis:100%; }
// 		}
// 		@media (max-width:640px) {
// 			.cbd-dm { width:100vw; margin:0; border-radius:0; max-height:100vh; }
// 			.cbd-dw { padding:0; }
// 		}
// 		@media (max-width:480px) {
// 			.cbd-summary-cards { grid-template-columns:repeat(2,1fr); } .cbd-overview-strip { grid-template-columns:1fr 1fr; } .cbd-scard { padding:10px 10px; } .cbd-scard__num { font-size:16px; }
// 			.cbd-filter-col { flex:1 1 100%; min-width:0; }
// 			.cbd-dm__search-input { width:90px; }
// 			.cbd-drill-modal__header { flex-wrap:wrap; row-gap:6px; }
// 		}
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
// 				const isPlain = el.classList.contains('cbd-tip-wrap--plain');
// 				const short = isPlain ? '' : el.textContent.trim();
// 				const icon_svg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(55,138,221,.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
// 				tip.innerHTML =
// 					'<div class="cbd-tip__header">' +
// 						'<span class="cbd-tip__icon">' + icon_svg + '</span>' +
// 						'<span class="cbd-tip__label">' + frappe.utils.escape_html(lbl) + '</span>' +
// 					'</div>' +
// 					'<div class="cbd-tip__body">' +
// 						'<span class="cbd-tip__amount">' + frappe.utils.escape_html(text) + '</span>' +
// 						(short ? '<span class="cbd-tip__hint">Abbreviated as ' + frappe.utils.escape_html(short) + '</span>' : '') +
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
// 				const top = above ? r.top + window.scrollY - th - 10 : r.bottom + window.scrollY + 8;
// 				tip.style.left = left + 'px';
// 				tip.style.top  = top  + 'px';
// 				tip.classList.add('cbd-tip--visible');
// 			};
// 			const _hide = () => { _hide_timer = setTimeout(() => tip.classList.remove('cbd-tip--visible'), 120); };
// 			document.addEventListener('mouseover', (e) => { const el = e.target.closest('.cbd-tip-wrap'); if (el && el.dataset.tip) _show(el); });
// 			document.addEventListener('mouseout',  (e) => { const el = e.target.closest('.cbd-tip-wrap'); if (el) _hide(); });
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
		this._elevate_frappe_alerts(); // keep Frappe toasts above our modals
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
					<span class="cbd-section-hd__label">Comparison Charts</span>
					<span class="cbd-section-hd__line"></span>
				</div>
				<div class="cbd-chart-card" id="cbd_chart_card" style="display:none">
					<div class="cbd-chart-card__legend" id="cbd_chart_legend"></div>
					<div class="cbd-chart-card__body" id="cbd_chart_body"></div>
				</div>
			</div>
		`);

		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
		// Apply button removed — filters auto-apply on change (debounced)

		this._inject_styles();
		this._ensure_panels();
		this._build_filters();
	}

	_init_with_permissions() {
		frappe.dom.freeze('Loading…');
		frappe.call({ method: 'creche_reports.api.creche_dashboard.get_user_permission_scope' })
			.then(r => { this._user_permission_scope = r.message || null; })
			.catch(() => { this._user_permission_scope = null; });
		frappe.call({
			method: 'creche_reports.api.creche_dashboard.get_partner_options',
			args: { txt: '' },
		}).then(r => {
			frappe.dom.unfreeze();
			const rows = r.message || [];
			if (!rows.length) { this._render_no_access(); return; }

			const partner_ids = rows.map(r => r.name);
			this._partner_label_to_id = {};
			rows.forEach(r => { this._partner_label_to_id[r.partner_name || r.name] = r.name; });
			// Cached so "Clear all" can fall back to the same
			// permission-scoped default the page loads with, instead of
			// an unrestricted, system-wide view.
			this._all_permitted_partner_ids = partner_ids;

			const f = this._fields && this._fields.partner_id;
			if (f) {
				const opts = rows.map(r => ({ value: r.partner_name || r.name, description: '' }));
				const orig = f.df.get_data;
				f.df.get_data = () => opts;
				try { f.set_value(opts.map(o => o.value)); } catch(e) {}
				f.df.get_data = orig;
			}
			const todayStr = frappe.datetime.get_today();
			this.load_data({ partner_id: partner_ids, end_date: todayStr });
		}).catch(() => {
			frappe.dom.unfreeze();
			this.load_data({ end_date: frappe.datetime.get_today() });
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

	// If a filter's available options ever resolve to exactly one choice,
	// select it automatically instead of making the user open the
	// dropdown just to pick the only thing in it. Fires at most once per
	// control (via `autoApplied`) so it never fights a user who
	// deliberately clears the field afterward, and only auto-selects when
	// nothing is already chosen and the request wasn't a live search
	// (empty `txt`) so it doesn't hijack normal typing.
	_wrap_autoselect_single(ctrl, forceInitial = true) {
		let autoApplied = false;
		const orig = ctrl.df.get_data;
		ctrl.df.get_data = (txt) => {
			return Promise.resolve(orig(txt)).then(opts => {
				if (!txt && !autoApplied && opts && opts.length === 1) {
					const current = ctrl.get_value() || [];
					if (!current.length) {
						autoApplied = true;
						setTimeout(() => {
							try {
								ctrl.set_value([opts[0].value]);
								if (ctrl.df.change) ctrl.df.change();
							} catch (e) {}
						}, 0);
					}
				}
				return opts;
			});
		};
		// Force an immediate check so the auto-select can happen on load
		// rather than only once the user opens the dropdown. Skipped for
		// filters that depend on another filter's current value (e.g.
		// Budget Reference depends on Partner) — those get checked
		// naturally the moment the user opens that dropdown, which
		// reflects whatever the dependency is set to at that point.
		if (forceInitial) Promise.resolve(ctrl.df.get_data('')).catch(() => {});
	}

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
					method: 'creche_reports.api.creche_dashboard.get_partner_options',
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
					this._debounce_load();
				},
			},
			render_input: true,
		});
		partner_ctrl.refresh();
		this._fields.partner_id = partner_ctrl;
		this._wrap_autoselect_single(partner_ctrl, true);

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
				change: () => { this._sel.budget_ref = budget_ref_ctrl.get_value() || []; this._debounce_load(); },
			},
			render_input: true,
		});
		budget_ref_ctrl.refresh();
		this._fields.budget_ref = budget_ref_ctrl;
		this._wrap_autoselect_single(budget_ref_ctrl, false);

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
				change: () => { this._sel.grant_id = grant_id_ctrl.get_value() || []; this._debounce_load(); },
			},
			render_input: true,
		});
		grant_id_ctrl.refresh();
		this._fields.grant_id = grant_id_ctrl;
		this._wrap_autoselect_single(grant_id_ctrl, false);

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
					this._debounce_load();
				},
			},
			render_input: true,
		});
		fy_ctrl.refresh();
		this._fields.financial_year = fy_ctrl;
		this._wrap_autoselect_single(fy_ctrl, true);

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
					this._debounce_load();
				},
			},
			render_input: true,
		});
		month_ctrl.refresh();
		this._fields.month = month_ctrl;
		this._wrap_autoselect_single(month_ctrl, true);

		const start_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'start_date'),
			df: {
				label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date',
				change: () => {
					this._sel.start_date = start_ctrl.get_value() || '';
					this._on_filter_change('start_date');
					this._validate_dates('start_date');
					this._debounce_load();
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
					this._debounce_load();
				},
			},
			render_input: true,
		});
		end_ctrl.refresh();
		this._fields.end_date = end_ctrl;
		// Default End Date to today. This also makes the Start/End Date
		// filter group show by default (instead of Financial Year/Month)
		// since _setup_filter_visibility treats a populated date field as
		// the active filter group.
		try { end_ctrl.set_value(frappe.datetime.get_today()); } catch(e) {}
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
					change: () => { this._sel[key] = ctrl.get_value() || []; this._debounce_load(); },
				},
				render_input: true,
			});
			ctrl.refresh();
			this._fields[key] = ctrl;
			this._wrap_autoselect_single(ctrl, false);
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

		// Clearing filters falls back to "everything I'm permitted to
		// see" — the same default the page loads with — rather than an
		// unrestricted, system-wide view. Re-select every permitted
		// partner (visually, in the filter) so what's on screen matches
		// what's actually being queried.
		const ids = this._all_permitted_partner_ids || [];
		if (ids.length) {
			const f = this._fields && this._fields.partner_id;
			if (f && this._partner_label_to_id) {
				const idSet = new Set(ids);
				const labels = Object.entries(this._partner_label_to_id)
					.filter(([, id]) => idSet.has(id))
					.map(([label]) => label);
				try { f.set_value(labels); } catch(e) {}
			}
			this.load_data({ partner_id: ids });
		} else {
			this.load_data({});
		}
	}


	// Auto-apply debounce: called from every filter change; waits 700ms before loading
	_debounce_load(delay_ms = 700) {
		clearTimeout(this._load_debounce_timer);
		this._load_debounce_timer = setTimeout(() => {
			this.load_data(this._get_effective_filters());
		}, delay_ms);
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
		// An empty Partner filter (however it got that way — the "Clear
		// all" button, or just removing every chip by hand) should mean
		// "everything I'm permitted to see", not an unfiltered query
		// scoped by nothing. Fall back to the full permitted list rather
		// than omitting the key.
		if (!v.partner_id && this._all_permitted_partner_ids && this._all_permitted_partner_ids.length) {
			v.partner_id = this._all_permitted_partner_ids;
		}
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

	// ── CHANGE #10: compress month list to "min → max" range display ──
	_compress_month_label(months_arr, financial_years_arr) {
		if (!months_arr || !months_arr.length) return null;
		const MONTH_ORDER = ['January','February','March','April','May','June',
		                     'July','August','September','October','November','December'];
		const sorted = [...months_arr].sort((a,b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
		if (sorted.length === 1) return sorted[0];
		if (sorted.length === 12) return 'All Months';
		// Show min to max
		return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
	}

	_filter_period_label() {
		const pf = this._panel_filters();
		const af = this._active_filters || {};
		const hasFY    = !!(af.financial_year && af.financial_year.length);
		const hasMonth = !!(af.month && af.month.length);
		const hasDate  = !!(pf.start_date || pf.end_date);
		const active   = hasFY || hasMonth || hasDate;

		let label = 'Amount';
		if (hasFY && hasMonth) {
			const fyStr = af.financial_year.join(', ');
			const mnStr = this._compress_month_label(af.month);
			label = `${fyStr} — ${mnStr}`;
		} else if (hasFY) {
			label = af.financial_year.join(', ');
		} else if (hasMonth) {
			label = this._compress_month_label(af.month);
		} else if (hasDate) {
			label = `${pf.start_date||''}${pf.end_date?' → '+pf.end_date:''}`;
		}

		return { active, label, hasFY, hasMonth, hasDate };
	}

	load_data(filters) {
		this._active_filters = filters || {};
		frappe.call({
			method: 'creche_reports.api.creche_dashboard.get_partner_budget_summary',
			freeze: true, freeze_message: 'Loading budget summary…',
			args: { filters: filters || {} },
			callback: (r) => {
				if (!r.message) return;
				this._all_partners = r.message.partners || [];
				this.render_summary(r.message.summary, r.message.partners || []);
				this.render_partners(r.message.partners);
			}
		});
	}


	// ═══════════════════════════════════════════════════════════════════════
	// CARD DESIGN  — render_summary  (8 cards)
	// CHANGE #4: Added "Expected Bank Balance" card (disbursement - utilisation)
	// CHANGE #5: "Unutilized Disb – Bank Bal." renamed to "Unutilized Disbursement"
	//            and value changed to disbursement - reported bank balance
	// ═══════════════════════════════════════════════════════════════════════

	render_summary(s, partners) {
		if (!s) return;
		const el = document.getElementById('cbd_summary_cards');
		if (!el) return;

		const bank_bal            = parseFloat(s.total_bank_balance) || 0;
		const total_disb          = parseFloat(s.total_disbursement)  || 0;
		const total_util          = parseFloat(s.total_utilisation)   || 0;
		const total_budget        = parseFloat(s.total_budget)        || 0;
		const interest_earned     = parseFloat(s.total_interest)     || 0;

		// ── Derived metrics (raw — no Math.max — so drill total = card always) ──
		const remaining_budget    = total_budget - total_util;      // Budget remaining to spend
		const unspent_disb        = total_disb   - total_util;      // Disbursed but not yet utilised (should ≈ bank)
		const bank_variance       = unspent_disb - bank_bal;        // Gap between expected & reported bank balance
		// Keep aliases for drill-down CFG compatibility
		const expected_bank_bal   = unspent_disb;
		const bank_bal_gap        = bank_variance;
		const unutilised_disb     = unspent_disb;

		// Partners who have utilised ≥85% of what's been disbursed to them
		const partners_80pct_list = (partners || []).filter(p => {
			const disb = parseFloat(p.total_disbursement) || 0;
			const util = parseFloat(p.total_utilisation) || 0;
			return disb > 0 && (util / disb) >= 0.85;
		});

		// ── 8-card layout — tells a complete financial story ─────────────────
		// Row 1: Budget story  →  Row 2: Cash & compliance
		const CARDS = [
			// ── Budget Flow ──────────────────────────────────────────────────────
			{
				panel:'budget', label:'Approved Budget', raw: total_budget, base: total_budget, accent:'#2563eb',
				subLabel: 'Total sanctioned grant amount',
			},
			{
				panel:'disbursement', label:'Total Disbursement', raw: total_disb, base: total_budget, accent:'#059669',
				subLabel: `${parseFloat(s.disbursement_pct||0).toFixed(1)}% of approved budget transferred`,
			},
			{
				panel:'utilisation', label:'Total Utilisation', raw: total_util, base: total_disb, accent:'#d97706',
				subLabel: `${(total_disb > 0 ? (total_util / total_disb * 100) : 0).toFixed(1)}% of disbursed amount utilised`,
			},
			{
				panel:'remaining_budget', label:'Balance Budget to be Disbursed', raw: remaining_budget, base: total_budget,
				accent: remaining_budget < 0 ? '#dc2626' : '#7c3aed',
				subLabel: remaining_budget < 0 ? '⚠ Over-utilized beyond approved budget' : 'Approved budget yet to be spent',
			},
			// ── Cash Position ─────────────────────────────────────────────────────
			{
				panel:'unspent_disb', label:'Expected Bank Balance', raw: unspent_disb, base: total_disb,
				accent: unspent_disb < 0 ? '#dc2626' : '#0d9488',
				subLabel: unspent_disb < 0 ? '⚠ Partners spent more than released' : 'Released but not yet reported as spent',
			},
			{
				panel:'bank_balance', label:'Reported Bank Balance', raw: bank_bal, base: total_disb, accent:'#0891b2',
				subLabel: 'Self-reported cash balance in partner accounts',
			},
			{
				panel:'bank_variance', label:'Bank Balance Difference', raw: bank_variance, base: total_disb,
				accent: Math.abs(bank_variance) < 1 ? '#16a34a' : bank_variance < 0 ? '#dc2626' : '#be185d',
				subLabel: Math.abs(bank_variance) < 1 ? '✓ Bank matches expected amount'
					: bank_variance < 0 ? '⚠ Bank higher than expected — review funds'
					: '⚠ Bank lower than expected — possible unreported spend',
			},
			// ── Compliance ────────────────────────────────────────────────────────
			{
				panel:'partners_80pct', label:'Partners with 85%+ Disbursement Utilization', count: partners_80pct_list.length,
				accent:'#15803d',
				subLabel: 'Partners who have utilised ≥85% of funds disbursed to them',
			},
			{
				panel:'pending_util', label:'Pending Utilization Submission',
				raw: null, count:'…', loading: true, accent:'#dc2626',
				subLabel: 'Partners who haven\'t submitted utilization',
			},
		];

		el.innerHTML = CARDS.map(c => {
			const pct = (!c.loading && c.base > 0 && c.raw !== null) ? (c.raw / c.base * 100) : null;
			const numHtml = c.count !== undefined
				? `<div class="cbd-scard__num" style="color:${c.accent}">${c.count}</div>`
				: `<div class="cbd-scard__num" style="color:${c.accent}">${this._fmtCard(c.raw, c.label)}</div>`;
			const subText = c.loading
				? 'Loading…'
				: (pct !== null
					? `<span class="cbd-scard__pct-badge" style="background:${c.accent}1f;color:${c.accent}">${pct.toFixed(1)}%</span> of total`
					: (c.subLabel || ''));

			// Whole-card tooltip content — same info as the number's own
			// tooltip, so hovering anywhere on the card (not just the
			// number) shows it.
			let cardTip;
			if (c.loading) {
				cardTip = '';
			} else if (c.count !== undefined) {
				cardTip = c.subLabel || `${c.count}`;
			} else {
				cardTip = this._fmtFull(parseFloat(c.raw) || 0);
			}
			const tipAttrs = cardTip
				? `data-tip="${frappe.utils.escape_html(cardTip)}" data-tip-label="${frappe.utils.escape_html(c.label)}"`
				: '';

			return `
			<div class="cbd-scard${cardTip ? ' cbd-tip-wrap cbd-tip-wrap--plain' : ''}" data-panel="${c.panel}" ${tipAttrs} style="border-left-color:${c.accent}">
				<div class="cbd-scard__lbl">${c.label}</div>
				${numHtml}
				<div class="cbd-scard__sub" id="${c.loading ? 'cbd_pending_sub' : ''}">${subText}</div>
				<div class="cbd-scard__cta" style="color:${c.accent}">
					<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
					View Line Items
				</div>
			</div>`;
		}).join('');

		const pfo_old = document.getElementById('cbd_pfo_banner');
		if (pfo_old) pfo_old.remove();

		el.querySelectorAll('.cbd-scard').forEach(card => {
			card.addEventListener('click', () => {
				const panel = card.dataset.panel;
				if (panel === 'budget')            this._open_drill_modal('budget');
				else if (panel === 'utilisation')  this._open_drill_modal('utilisation');
				else if (panel === 'disbursement') this._open_drill_modal('disbursement');
				else if (panel === 'pending_util') this._open_pending_utilisation_modal();
				else if (panel === 'partners_80pct') this._open_partners_80pct_modal();
				else this._open_card_drill_modal(panel);
			});
		});

		this._last_summary = s;
		this._approved_creches_count = parseFloat(s.total_creches) || 0;
		this._render_partner_chart();
		this._render_analytics_charts(s, partners || []);
		this._load_pending_utilisation_count();
	}

	// Ensure any dynamically-added Frappe toasts/alerts always appear above our modals
	_elevate_frappe_alerts() {
		if (this._alertObserver) return; // run only once
		const SELECTORS = [
			'.frappe-toast-area', '.frappe-alert', '.alert-container',
			'.toast-container', '.notification-container',
			'.frappe-toast', '[data-frappe-toast]',
		];
		const elevate = () => {
			SELECTORS.forEach(sel => {
				document.querySelectorAll(sel).forEach(el => {
					el.style.setProperty('z-index', '99999', 'important');
					if (!el.style.position || el.style.position === 'static')
						el.style.position = 'fixed';
				});
			});
		};
		this._alertObserver = new MutationObserver(elevate);
		this._alertObserver.observe(document.body, { childList: true, subtree: true });
		elevate(); // also elevate any already-present alerts
	}

	// ── FIX ──
	// "Pending as of" should mean "as of the End Date filter, has the
	// PREVIOUS month's utilisation (and any earlier month, per each
	// budget's own start date) been submitted" — not the End Date's own
	// month, since that month is usually still in progress and isn't due
	// yet. E.g. End Date = 08/07/2026 → check June 2026 and earlier.
	// The backend already caps the earliest month checked at each
	// budget's start_date, so shifting only the far end here is enough.
	_pending_cutoff_from_end_date(endDateStr) {
		const parts = String(endDateStr || '').split('-').map(Number);
		if (parts.length !== 3 || parts.some(isNaN)) return endDateStr;
		const [y, m] = parts; // m is 1-indexed month of the selected End Date
		// Day 0 of the selected month == the last day of the previous month.
		const prevMonthEnd = new Date(y, m - 1, 0);
		const yy = prevMonthEnd.getFullYear();
		const mm = String(prevMonthEnd.getMonth() + 1).padStart(2, '0');
		const dd = String(prevMonthEnd.getDate()).padStart(2, '0');
		return `${yy}-${mm}-${dd}`;
	}

	_load_pending_utilisation_count() {
		// Cutoff is driven by the dashboard's own End Date filter (which
		// defaults to today), shifted back to the end of the PREVIOUS
		// month — see _pending_cutoff_from_end_date for why.
		const endDate = (this._active_filters && this._active_filters.end_date) || frappe.datetime.get_today();
		const cutoff = this._pending_cutoff_from_end_date(endDate);
		this._pending_cutoff = cutoff;

		frappe.call({
			method: 'creche_reports.api.creche_dashboard.get_pending_utilisation_summary',
			args: { cutoff_date: cutoff, target_fy: null, target_month: null, filters: JSON.stringify(this._active_filters || {}) },
			callback: (r) => {
				const data = (r.message && r.message.partners) || [];
				this._pending_util_data = data;
				const card = document.querySelector('.cbd-scard[data-panel="pending_util"]');
				if (card) {
					const numEl = card.querySelector('.cbd-scard__num');
					const subEl = card.querySelector('#cbd_pending_sub');
					if (numEl) numEl.textContent = data.length;
					if (subEl) {
					subEl.id = '';
					const MNAMES = ['January','February','March','April','May','June',
					                'July','August','September','October','November','December'];
					const parts = String(cutoff).split('-').map(Number);
					const cutoffLabel = (parts.length === 3 && !parts.some(isNaN)) ? `${MNAMES[parts[1]-1]} ${parts[0]}` : cutoff;
					subEl.textContent = `partner${data.length===1?'':'s'} — through ${cutoffLabel}`;
				}
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

	_render_pfo_alert(data) {
		const old = document.getElementById('cbd_pfo_banner');
		if (old) old.remove();

		const scope = this._user_permission_scope;
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
	// CHART
	// CHANGE #6: Fixed chart — now shows Expected Bank Balance vs Reported Bank Balance
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
		// CHANGE #4: Expected Bank Balance = disb - util
		const expectedBankBal = disb - util; // raw, consistent with card

		legendEl.innerHTML = `
			<div class="cbd-chart-legend__items">
				<span class="cbd-chart-legend__item" style="font-weight:700;color:#0f172a">Multi-Metric Comparison</span>
			</div>
			<span class="cbd-chart-legend__period" title="Active filter period">${frappe.utils.escape_html(period.label)}</span>`;

		// CHANGE #6: Third donut is now Expected Bank Balance vs Reported Bank Balance
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
				title: 'Expected vs Reported Bank Balance',
				baseLabel: 'Expected Bank Balance', baseVal: expectedBankBal,
				usedLabel: 'Reported Bank Balance', usedVal: bankBal,
				usedColor: '#db2777', remColor: '#e2e8f0', remLabel: 'Bank Balance Difference',
				drillType: 'bank_balance',
			},
		];

		const R = 54, CX = 70, CY = 70, STROKE = 20;
		const circumference = 2 * Math.PI * R;

		const panelsHtml = DONUTS.map((d, di) => {
			const base = Math.max(d.baseVal, 0);
			const used = Math.max(Math.min(d.usedVal, base), 0);
			const rem  = Math.max(base - used, 0);
			const overflow = d.usedVal > base && base > 0;

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
				if (type === 'bank_balance' || type === 'unutilised_disb' || type === 'expected_bank_bal' || type === 'bank_bal_gap') {
					this._open_card_drill_modal(type);
					return;
				}
				this._open_drill_modal(type === 'budget' || type === 'utilisation' || type === 'disbursement' ? type : 'budget');
			});
		});
	}

	// ═══════════════════════════════════════════════════════════════════════
	// PENDING UTILIZATION MODAL
	// Cutoff is taken from the dashboard's own End Date filter (defaults to
	// today) rather than a separate picker inside the popup — this keeps
	// the card count and the popup's list always answering the same
	// question for the same date.
	// ═══════════════════════════════════════════════════════════════════════
	_open_pending_utilisation_modal() {
		const old = document.getElementById('cbd_drill_wrap');
		if (old) old.remove();

		const endDate = (this._active_filters && this._active_filters.end_date) || frappe.datetime.get_today();
		const cutoff = this._pending_cutoff_from_end_date(endDate);

		const wrap = document.createElement('div');
		wrap.id = 'cbd_drill_wrap';
		wrap.className = 'cbd-dw';
		wrap.innerHTML = `
			<div class="cbd-dm" id="cbd_dm_box" style="max-width:min(1600px,98vw)">
				<!-- Topbar: title + export + close only -->
				<div class="cbd-dm__topbar">
					<div class="cbd-dm__topbar-left">
						<span class="cbd-bc__item cbd-bc__item--active">Pending Utilization Submission</span>
					</div>
					<div class="cbd-dm__actions">
						<div class="cbd-dm__search">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
							<input type="text" class="cbd-dm__search-input" data-tbl="cbd_pu_table" placeholder="Search...">
						</div>
						<div class="cbd-exp-dd" id="cbd_pu_exp_dd">
							<button class="cbd-exp-btn cbd-exp-btn--main" data-tbl="cbd_pu_table" data-fname="Pending_Utilization" data-title="Pending Utilization Submission">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								Export
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
							</button>
							<div class="cbd-exp-dd__menu">
								<button class="cbd-exp-dd__item" data-fmt="xlsx">Excel (.xlsx)</button>
								<button class="cbd-exp-dd__item" data-fmt="pdf">PDF (A4)</button>
							</div>
						</div>
						<button class="cbd-dm__close" title="Close (Esc)">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					</div>
				</div>

				<!-- Cutoff info -->
				<div class="cbd-pu__filterbar">
					<div class="cbd-pu__filterbar-left">
						<span class="cbd-pu__datelbl">Checking submissions through:</span>
						<span id="cbd_pu_dateinfo" style="font-size:12px;font-weight:700;color:#1e3a5f"></span>
					</div>
				</div>

				<div class="cbd-dm__body">
					<div class="cbd-dm__tbl-wrap" id="cbd_pu_body">
						<div class="cbd-dm__loading">Loading…</div>
					</div>
				</div>
			</div>`;
		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

		const _esc = e => { if (e.key === 'Escape') this._close_drill_modal_main(); };
		document.addEventListener('keydown', _esc);
		wrap._esc = _esc;
		wrap.addEventListener('click', e => { if (e.target === wrap) this._close_drill_modal_main(); });

		const box = wrap.querySelector('#cbd_dm_box');

		// ── Delegated event handler ──
		box.addEventListener('click', e => {
			if (e.target.closest('.cbd-dm__close')) { this._close_drill_modal_main(); return; }
			// Export
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
			// Send Email (per row — the only way to send now)
			const sendOne = e.target.closest('.cbd-pu__send-one');
			if (sendOne) { this._send_utilisation_reminder([sendOne.dataset.pid], sendOne, null); return; }
		});
		document.addEventListener('click', e => {
			if (!e.target.closest('.cbd-exp-dd')) {
				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
			}
		});
		box.addEventListener('input', e => {
			const inp = e.target.closest('.cbd-dm__search-input');
			if (inp) this._filter_table_rows(inp.dataset.tbl, inp.value);
		});

		this._reload_pending_util_by_cutoff(cutoff);
	}

	_reload_pending_util_by_cutoff(cutoff) {
		const body = document.getElementById('cbd_pu_body');
		if (body) body.innerHTML = '<div class="cbd-dm__loading">Loading…</div>';

		const infoEl = document.getElementById('cbd_pu_dateinfo');
		if (infoEl) {
			const MNAMES = ['January','February','March','April','May','June',
			                'July','August','September','October','November','December'];
			const parts = String(cutoff).split('-').map(Number);
			infoEl.textContent = (parts.length === 3 && !parts.some(isNaN))
				? `${MNAMES[parts[1]-1]} ${parts[0]}`
				: frappe.datetime.str_to_user(cutoff);
		}

		frappe.call({
			method: 'creche_reports.api.creche_dashboard.get_pending_utilisation_summary',
			args: { cutoff_date: cutoff, target_fy: null, target_month: null, filters: JSON.stringify(this._active_filters || {}) },
			callback: (r) => {
				const data = (r.message && r.message.partners) || [];
				this._pending_util_data = data;
				this._render_pending_utilisation_rows(data);
			},
			error: () => {
				if (body) body.innerHTML = '<div class="cbd-dm__empty">Failed to load data.</div>';
			},
		});
	}

		_render_pending_utilisation_rows(data) {
		const body = document.getElementById('cbd_pu_body');
		if (!body) return;

		if (!data.length) {
			body.innerHTML = `<div class="cbd-dm__empty">
				<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				<div style="margin-top:8px;font-weight:600;color:#16a34a">All partners are up to date</div>
				<div style="font-size:12px;color:#6b7280;margin-top:4px">No pending utilization submissions found.</div>
			</div>`;
			return;
		}

		// ── FIX ──
		// Grouped by partner with real rowspan — Partner Name / Total
		// Pending Months / Email / the action button each span every
		// budget row for that partner (one merged cell), while Budget
		// Reference / Months Pending / Months stay one row per budget.
		// This mirrors the requested spreadsheet layout exactly, and the
		// export path (_export_pending_util_table) walks these same
		// rowspan attributes to produce real merged cells in Excel.
		const partners = data
			.map(p => ({
				partner_id: p.partner_id, partner_name: p.partner_name, email: p.email,
				budgets: (p.budgets || []).filter(b => b.missing_months && b.missing_months.length),
			}))
			.filter(p => p.budgets.length)
			.sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || ''));

		let rowsHtml = '';
		partners.forEach((p, pIdx) => {
			const n = p.budgets.length;
			const totalPending = p.budgets.reduce((s, b) => s + b.missing_months.length, 0);
			const pid = frappe.utils.escape_html(p.partner_id || '');
			const pname = frappe.utils.escape_html(p.partner_name || p.partner_id || '—');
			const emailHtml = p.email ? frappe.utils.escape_html(p.email) : '<span class="cbd-pu__no-email">No email</span>';

			p.budgets.forEach((b, bIdx) => {
				const bref = frappe.utils.escape_html(b.budget_reference_name || b.budget_id || '—');
				const monthChips = b.missing_months.map(m =>
					`<span class="cbd-pu__month-chip" style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca">${frappe.utils.escape_html(m.month)} (${frappe.utils.escape_html(m.financial_year)})</span>`
				).join(' ');

				rowsHtml += `<tr class="cbd-dt__row" data-partner-idx="${pIdx}">`;
				if (bIdx === 0) {
					rowsHtml += `
						<td class="cbd-dt__num" rowspan="${n}" style="vertical-align:middle">${pIdx + 1}</td>
						<td class="cbd-dt__name" rowspan="${n}" style="white-space:normal;min-width:140px;font-weight:700;vertical-align:middle">${pname}</td>`;
				}
				rowsHtml += `
					<td style="white-space:normal;min-width:140px">${bref}</td>
					<td style="text-align:center;font-weight:800;color:#dc2626">${b.missing_months.length}</td>
					<td style="min-width:260px;max-width:420px">
						<div class="cbd-pu__months-cell">${monthChips || '—'}</div>
					</td>`;
				if (bIdx === 0) {
					rowsHtml += `
						<td style="text-align:center;font-weight:800;color:#1e3a5f;vertical-align:middle" rowspan="${n}">${totalPending}</td>
						<td style="font-size:12px;min-width:180px;white-space:normal;vertical-align:middle" rowspan="${n}">${emailHtml}</td>
						<td class="cbd-dt__act" rowspan="${n}" style="vertical-align:middle">
							<button class="cbd-dt__btn cbd-pu__send-one" data-pid="${pid}"
								${p.email ? '' : 'disabled'}
								title="${p.email ? 'Open email reminder for ' + p.partner_name : 'No email on file'}">Send Email</button>
						</td>`;
				}
				rowsHtml += `</tr>`;
			});
		});

		body.innerHTML = `
			<table class="cbd-dt cbd-pu__grouped" id="cbd_pu_table">
				<thead><tr>
					<th class="cbd-dt__th cbd-dt__th--num">#</th>
					<th class="cbd-dt__th">Partner Name</th>
					<th class="cbd-dt__th">Budget Reference</th>
					<th class="cbd-dt__th" style="text-align:center;width:90px">Months Pending</th>
					<th class="cbd-dt__th">Months</th>
					<th class="cbd-dt__th" style="text-align:center;width:120px">Total Pending Months</th>
					<th class="cbd-dt__th">Email</th>
					<th class="cbd-dt__th" style="width:100px"></th>
				</tr></thead>
				<tbody>${rowsHtml}</tbody>
			</table>`;

		// Grouped/merged tables can't be safely re-sorted or paginated (that
		// would reorder or hide rows independently of their rowspan), so
		// this table skips both — it stays statically grouped by partner.
	}

	// ── FIX ──
	// No longer sends email through the server. Clicking "Remind" now
	// simply opens a mailto: link, which launches the user's own default
	// mail client (Outlook, etc.) with the recipient(s), subject, and
	// message pre-filled — the user reviews and sends it themselves.
	_send_utilisation_reminder(partner_ids, triggerBtn, customMessage) {
		if (!partner_ids || !partner_ids.length) return;

		const emailMap = {};
		(this._pending_util_data || []).forEach(p => { if (p.email) emailMap[p.partner_id] = p.email; });

		const emails = [...new Set(partner_ids.map(pid => emailMap[pid]).filter(Boolean))];
		if (!emails.length) {
			frappe.show_alert({ message: 'No valid email addresses found for the selected partner(s)', indicator: 'red' }, 5);
			return;
		}

		const subject = 'Utilisation Report Submission Reminder';
		const defaultBody = 'This is a reminder that your utilisation report submission is pending. Kindly submit it at the earliest to keep your budget records up to date.';
		const body = customMessage || defaultBody;

		const mailto = `mailto:${emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		window.location.href = mailto;

		frappe.show_alert({ message: `Opening your email client for ${emails.length} partner${emails.length === 1 ? '' : 's'}…`, indicator: 'blue' }, 4);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// PARTNERS ≥85% UTILISED MODAL
	// Only lists partners who actually meet the threshold (not every
	// partner with their percentage) since that's what was asked for.
	// ═══════════════════════════════════════════════════════════════════════
	_open_partners_80pct_modal() {
		const old = document.getElementById('cbd_drill_wrap');
		if (old) old.remove();

		const partners = this._all_partners || [];
		const eligible = partners.filter(p => {
			const disb = parseFloat(p.total_disbursement) || 0;
			const util = parseFloat(p.total_utilisation) || 0;
			return disb > 0 && (util / disb) >= 0.85;
		}).map(p => {
			const disb = parseFloat(p.total_disbursement) || 0;
			const util = parseFloat(p.total_utilisation) || 0;
			return { partner_name: p.partner_name, disb, util, pct: disb > 0 ? (util / disb * 100) : 0 };
		}).sort((a,b) => b.pct - a.pct);

		const wrap = document.createElement('div');
		wrap.id = 'cbd_drill_wrap';
		wrap.className = 'cbd-dw';
		wrap.innerHTML = `
			<div class="cbd-dm" id="cbd_dm_box">
				<div class="cbd-dm__track cbd-dm__track--2" id="cbd_dm_track" style="width:100%">
					<div class="cbd-dm__page cbd-dm__page--2" id="cbd_dm_p1" style="width:100%"></div>
				</div>
			</div>`;
		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

		const box = wrap.querySelector('#cbd_dm_box');
		box.addEventListener('click', e => {
			if (e.target.closest('.cbd-dm__close')) { this._close_drill_modal_main(); return; }
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
		});
		document.addEventListener('click', e => {
			if (!e.target.closest('.cbd-exp-dd')) {
				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
			}
		});
		wrap.addEventListener('click', e => { if (e.target === wrap) this._close_drill_modal_main(); });
		const _esc = e => { if (e.key === 'Escape') this._close_drill_modal_main(); };
		document.addEventListener('keydown', _esc);
		wrap._esc = _esc;

		this._dm_type = 'partners_80pct';

		const rows = eligible.map((p, i) => `
			<tr class="cbd-dt__row">
				<td class="cbd-dt__num">${i + 1}</td>
				<td class="cbd-dt__name">${frappe.utils.escape_html(p.partner_name || '—')}</td>
				<td class="cbd-dt__r">${this._fmtTip(p.disb,'Disbursed')}</td>
				<td class="cbd-dt__r">${this._fmtTip(p.util,'Utilised')}</td>
				<td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:#16a34a">${p.pct.toFixed(1)}%</span></td>
			</tr>`).join('');

		const p1 = document.getElementById('cbd_dm_p1');
		p1.innerHTML = `
			${this._dm_topbar('Partners with 85%+ Disbursement Utilization', null, null, 1, 'cbd_dm_t80pct', 'Partners_80pct_Disbursement_Utilization')}
			<div class="cbd-dm__body">
				<div class="cbd-dm__tbl-wrap">
					<table class="cbd-dt" id="cbd_dm_t80pct">
						<thead><tr>
							<th class="cbd-dt__th cbd-dt__th--num">#</th>
							<th class="cbd-dt__th">Partner</th>
							<th class="cbd-dt__th cbd-dt__th--r">Disbursed</th>
							<th class="cbd-dt__th cbd-dt__th--r">Utilised</th>
							<th class="cbd-dt__th cbd-dt__th--r">% of Disbursed</th>
						</tr></thead>
						<tbody>${rows || `<tr><td colspan="5" style="text-align:center;padding:28px;color:#94a3b8">No partners have reached 85% utilisation yet.</td></tr>`}</tbody>
					</table>
				</div>
			</div>`;

		setTimeout(() => this._enhance_table('cbd_dm_t80pct'), 50);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// CARD DRILL MODAL
	// ═══════════════════════════════════════════════════════════════════════
	_open_card_drill_modal(panel) {
		// Helper to parse float safely
		const _f = v => parseFloat(v) || 0;
		// NOTE: All values are RAW (no Math.max clamp) — both card formulas and CFG formulas
		// are identical, so drill-down Total row ALWAYS equals card value exactly.
		// Negatives are valid: over-utilised partner shows negative expected/gap values.
		const CFG = {
			bank_balance: {
				title:'Reported Bank Balance', col1:'Reported Bank Bal.',
				getVal:  p => _f(p.total_bank_balance),
				getBVal: b => _f(b.bank_balance),
			},
			expected_bank_bal: {
				// Raw: Disbursement − Utilisation (may be negative for over-utilised partners)
				// Sum of raw values = aggregate total = card value
				title:'Expected Bank Balance', col1:'Expected Bank Bal. (Disb−Util)',
				getVal:  p => _f(p.total_disbursement) - _f(p.total_utilisation),
				getBVal: b => _f(b.disbursement)       - _f(b.utilisation),
			},
			unutilised_disb: {
				// Raw: Disbursement − Reported Bank Balance (may be negative if bank > disb)
				title:'Expected Bank Balance', col1:'Expected Bank Bal. (Disb−Bank Bal.)',
				getVal:  p => _f(p.total_disbursement) - _f(p.total_bank_balance),
				getBVal: b => _f(b.disbursement)       - _f(b.bank_balance),
			},
			bank_bal_gap: {
				title:'Bank Balance Difference', col1:'Bank Balance Difference (Expected−Reported)',
				getVal:  p => (_f(p.total_disbursement) - _f(p.total_utilisation)) - _f(p.total_bank_balance),
				getBVal: b => (_f(b.disbursement)       - _f(b.utilisation))       - _f(b.bank_balance),
			},
			// ── New analytical cards ─────────────────────────────────────────────
			remaining_budget: {
				title:'Balance Budget to be Disbursed', col1:'Balance Budget to be Disbursed (Budget − Utilisation)',
				getVal:  p => _f(p.total_budget)       - _f(p.total_utilisation),
				getBVal: b => _f(b.budget)             - _f(b.utilisation),
			},
			unspent_disb: {
				title:'Expected Bank Balance', col1:'Expected Bank Bal. (Disbursed − Utilised)',
				getVal:  p => _f(p.total_disbursement) - _f(p.total_utilisation),
				getBVal: b => _f(b.disbursement)       - _f(b.utilisation),
			},
			bank_variance: {
				title:'Bank Balance Difference', col1:'Bank Balance Difference (Expected − Reported)',
				getVal:  p => (_f(p.total_disbursement) - _f(p.total_utilisation)) - _f(p.total_bank_balance),
				getBVal: b => (_f(b.disbursement)       - _f(b.utilisation))       - _f(b.bank_balance),
			},
			pending_util: {
				title:'Partners – Pending Utilization', col1:'Util %',
				getVal:  p => _f(p.utilised_pct),
				getBVal: b => _f(b.utilised_pct),
				isPct: true,
			},
		};
		const cfg = CFG[panel];
		if (!cfg) return;
		this._dm_type = panel;

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

		this._dm_page = 1;
		const partners = this._all_partners || [];
		const table_id  = 'cbd_dm_t1';
		const fname     = cfg.title.replace(/\s+/g,'_');

		const rows = partners.map((p,idx) => {
			const val = cfg.getVal(p);
			const disp = cfg.isPct ? `<span class="cbd-dt__pct" style="color:${val<75?'#dc2626':'#16a34a'}">${val.toFixed(1)}%</span>` : this._fmtTip(val, cfg.col1);
			return `<tr class="cbd-dt__row" data-pidx="${idx}" style="cursor:pointer" title="Click to view budget details">
				<td class="cbd-dt__num">${idx+1}</td>
				<td class="cbd-dt__name">${frappe.utils.escape_html(p.partner_name||'—')}</td>
				<td class="cbd-dt__r">${disp}</td>
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
						</tr></thead>
						<tbody>${rows}</tbody>
						<tfoot><tr>
							<td class="cbd-dt__foot" colspan="2" style="font-weight:700;color:#1e3a5f">Grand Total</td>
							<td class="cbd-dt__r cbd-dt__foot" style="font-weight:700;color:${partners.reduce((s,p)=>s+cfg.getVal(p),0)<0?'#dc2626':'#1e3a5f'}">${gt}</td>
						</tr></tfoot>
					</table>
				</div>
			</div>`;

		setTimeout(() => this._enhance_table(table_id), 50);

		p1.addEventListener('click', e => {
			const row = e.target.closest('tr.cbd-dt__row[data-pidx]');
			if (!row) return;
			const partner = (this._all_partners||[])[parseInt(row.dataset.pidx)];
			if (!partner) return;
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
			const bcR = p2.querySelector('#cbd_bc_root');
			if (bcR) bcR.addEventListener('click', () => {
				this._dm_page = 1;
				const tr = document.getElementById('cbd_dm_track');
				if (tr) tr.style.transform = 'translateX(0)';
			});
			setTimeout(() => this._enhance_table(t2id), 50);
		});
	}

	// ═══════════════════════════════════════════════════════════════════════
	// UNIVERSAL DRILL MODAL
	// CHANGE #3: Added "Consolidated Line Items" button at partner level
	// ═══════════════════════════════════════════════════════════════════════
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

		const box = wrap.querySelector('#cbd_dm_box');
		box.addEventListener('click', e => {
			if (e.target.closest('.cbd-dm__close')) { this._close_drill_modal_main(); return; }
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
			if (e.target.closest('#cbd_bc_root')) { this._dm_goto(1); return; }
			if (e.target.closest('#cbd_bc_p2'))   { this._dm_goto(2); return; }
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
	}

	// ─── Page 1: Partners ────────────────────────────────────────────────
	// CHANGE #3: Added per-partner "Consolidated Line Items" button
	_render_dm_page1() {
		const p1   = document.getElementById('cbd_dm_p1');
		if (!p1) return;
		this._dm_goto(1);

		const type     = this._dm_type;
		const partners = this._all_partners || [];
		const TITLE = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
		const showConsolidatedBtn = (type === 'budget' || type === 'utilisation');

		const rows = partners.map((p, idx) => {
			const bud  = parseFloat(p.total_budget)       || 0;
			const util = parseFloat(p.total_utilisation)  || 0;
			const disb = parseFloat(p.total_disbursement) || 0;
			const pct  = parseFloat(p.utilised_pct)       || 0;
			const chip = pct>=75?'#16a34a':'#dc2626';
			const pname = frappe.utils.escape_html(p.partner_name||'—');

			const budgets = p.budgets || [];
			const grantIds  = [...new Set(budgets.map(b=>b.grant_id).filter(Boolean))].join(', ') || '—';
			const states    = [...new Set(budgets.map(b=>b.state).filter(Boolean))].join(', ')    || '—';
			const districts = [...new Set(budgets.map(b=>b.district).filter(Boolean))].join(', ') || '—';
			const blocks    = [...new Set(budgets.map(b=>b.block).filter(Boolean))].join(', ')    || '—';
			const approvedCreches = p.total_creches         || 0;

			let amtCells = '';
			if (type === 'budget') {
				amtCells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			} else if (type === 'utilisation') {
				const disb_pct = bud>0?(disb/bud*100):0;
				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
				const util_of_disb_pct = disb>0?(util/disb*100):0;
				const chip_u = util_of_disb_pct>=75?'#16a34a':'#dc2626';
				amtCells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				            <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
				            <td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_u}">${util_of_disb_pct.toFixed(1)}%</span></td>`;
			} else {
				const disb_pct = bud>0?(disb/bud*100):0;
				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
				// Utilisation % here is against the disbursed amount (not
				// budget) — that's the meaningful comparison once the money
				// has actually reached the partner.
				const util_of_disb_pct = disb>0?(util/disb*100):0;
				const chip_u = util_of_disb_pct>=75?'#16a34a':'#dc2626';
				amtCells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				            <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
				            <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
				            <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_u}">${util_of_disb_pct.toFixed(1)}%</span></td>`;
			}

			// Row is fully clickable → navigates to budget level
			return `<tr class="cbd-dt__row" data-pidx="${idx}" style="cursor:pointer" title="Click to view budget details">
				<td class="cbd-dt__num">${idx+1}</td>
				<td class="cbd-dt__name" style="white-space:normal;min-width:130px">${pname}</td>
				<td style="font-size:11px;white-space:normal;min-width:90px">${frappe.utils.escape_html(grantIds)}</td>
				<td style="font-size:11px;white-space:normal;min-width:80px">${frappe.utils.escape_html(states)}</td>
				<td style="font-size:11px;white-space:normal;min-width:80px">${frappe.utils.escape_html(districts)}</td>
				<td style="font-size:11px;white-space:normal;min-width:70px">${frappe.utils.escape_html(blocks)}</td>
				<td class="cbd-dt__r" style="min-width:60px">${approvedCreches.toLocaleString('en-IN')}</td>
				${amtCells}

			</tr>`;
		}).join('');

		const gt_bud  = partners.reduce((s,p)=>s+(parseFloat(p.total_budget)||0),0);
		const gt_util = partners.reduce((s,p)=>s+(parseFloat(p.total_utilisation)||0),0);
		const gt_disb = partners.reduce((s,p)=>s+(parseFloat(p.total_disbursement)||0),0);
		const gt_appr = partners.reduce((s,p)=>s+(p.total_creches||0),0);
		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
		const gt_util_of_disb_pct = gt_disb>0?(gt_util/gt_disb*100):0;
		let foot_cells = '';
		if (type==='budget')
			foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
		else if (type==='utilisation')
			foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${gt_util_of_disb_pct.toFixed(1)}%</td>`;
		else
			foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_util_of_disb_pct.toFixed(1)}%</td>`;

		let amtHeaders = '';
		if (type==='budget')
			amtHeaders = '<th class="cbd-dt__th cbd-dt__th--r">Budget</th><th class="cbd-dt__th cbd-dt__th--r">Util %</th>';
		else if (type==='utilisation')
			amtHeaders = '<th class="cbd-dt__th cbd-dt__th--r">Budget</th><th class="cbd-dt__th cbd-dt__th--r">Disbursed</th><th class="cbd-dt__th cbd-dt__th--r">Utilisation</th><th class="cbd-dt__th cbd-dt__th--r">Disb %</th><th class="cbd-dt__th cbd-dt__th--r">Util %</th>';
		else
			amtHeaders = '<th class="cbd-dt__th cbd-dt__th--r">Budget</th><th class="cbd-dt__th cbd-dt__th--r">Disbursed</th><th class="cbd-dt__th cbd-dt__th--r">Disb %</th><th class="cbd-dt__th cbd-dt__th--r">Utilised</th><th class="cbd-dt__th cbd-dt__th--r">Util %</th>';


		const table_id  = 'cbd_dm_t1';
		const fname     = (TITLE[type] || type).replace(/\s+/g,'_');

		p1.innerHTML = `
			${this._dm_topbar(TITLE[type], null, null, 1, table_id, fname)}
			<div class="cbd-dm__body">
				<div class="cbd-dm__tbl-wrap">
					<table class="cbd-dt" id="${table_id}" style="table-layout:auto">
						<thead><tr>
							<th class="cbd-dt__th cbd-dt__th--num">#</th>
							<th class="cbd-dt__th">Partner</th>
							<th class="cbd-dt__th">Grant ID(s)</th>
							<th class="cbd-dt__th">States</th>
							<th class="cbd-dt__th">Districts</th>
							<th class="cbd-dt__th">Blocks</th>
							<th class="cbd-dt__th cbd-dt__th--r">Approved Creches</th>
							${amtHeaders}

						</tr></thead>
						<tbody>${rows}</tbody>
						<tfoot><tr>
							<td class="cbd-dt__foot" colspan="6" style="font-weight:800">Grand Total</td>
							<td class="cbd-dt__r cbd-dt__foot">${gt_appr.toLocaleString('en-IN')}</td>
							${foot_cells}
						</tr></tfoot>
					</table>
				</div>
			</div>`;

		setTimeout(() => this._enhance_table(table_id), 50);

		// ROW CLICK: clicking any row navigates to budget level (page 2)
		p1.addEventListener('click', e => {
			const row = e.target.closest('tr.cbd-dt__row[data-pidx]');
			if (!row) return;
			const idx = parseInt(row.dataset.pidx);
			this._dm_partner = (this._all_partners||[])[idx];
			if (this._dm_partner) this._render_dm_page2();
		});
	}

			// ─── Page 2: Budget rows ────────────────────────────────────────────
	// silent=true: render page 2 content without animating to it (for back-nav from page 3)
	_render_dm_page2(silent = false) {
		const p2      = document.getElementById('cbd_dm_p2');
		if (!p2) return;
		if (!silent) this._dm_goto(2);

		const type    = this._dm_type;
		const partner = this._dm_partner;
		const budgets = partner.budgets || [];
		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
		const TITLE   = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
		const COLS    = {
			budget:       ['Budget Reference', 'Grant ID', 'Start Date', 'End Date', 'Budget', 'Util %'],
			utilisation:  ['Budget Reference', 'Grant ID', 'Start Date', 'End Date', 'Budget', 'Disbursed', 'Utilisation', 'Disb %', 'Util %'],
			disbursement: ['Budget Reference', 'Grant ID', 'Start Date', 'End Date', 'Budget', 'Disbursed', 'Disb %', 'Utilised', 'Util %'],
		};

		const rows = budgets.map((b, i) => {
			const bud  = parseFloat(b.budget)       || 0;
			const util = parseFloat(b.utilisation)  || 0;
			const disb = parseFloat(b.disbursement) || 0;
			const pct  = parseFloat(b.utilised_pct) || 0;
			const chip = pct>=75?'#16a34a':'#dc2626';
			let cells = '';
			const dateCells = `<td style="white-space:nowrap;font-size:12px">${this._date(b.grant_start)||'—'}</td>
			                    <td style="white-space:nowrap;font-size:12px">${this._date(b.grant_end)||'—'}</td>`;
			if (type === 'budget') {
				cells = `${dateCells}<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			} else if (type === 'utilisation') {
				const disb_pct = bud>0?(disb/bud*100):0;
				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
				const util_of_disb_pct = disb>0?(util/disb*100):0;
				const chip_u = util_of_disb_pct>=75?'#16a34a':'#dc2626';
				cells = `${dateCells}<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
				         <td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_u}">${util_of_disb_pct.toFixed(1)}%</span></td>`;
			} else {
				const disb_pct = bud>0?(disb/bud*100):0;
				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
				const util_of_disb_pct = disb>0?(util/disb*100):0;
				const chip_u = util_of_disb_pct>=75?'#16a34a':'#dc2626';
				cells = `${dateCells}<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
				         <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_u}">${util_of_disb_pct.toFixed(1)}%</span></td>`;
			}
			return `<tr class="cbd-dt__row" data-bidx="${i}" style="cursor:pointer" title="Click to view line items">
				<td class="cbd-dt__num">${i+1}</td>
				<td class="cbd-dt__name">
					<div style="font-weight:600;color:#111827">${frappe.utils.escape_html(b.budget_reference_name||'—')}</div>
					${b.state?`<div style="font-size:11px;color:#9ca3af">${frappe.utils.escape_html(b.state)}</div>`:''}
				</td>
				<td>${frappe.utils.escape_html(b.grant_id||'—')}</td>
				${cells}

			</tr>`;
		}).join('');

		const gt_bud  = budgets.reduce((s,b)=>s+(parseFloat(b.budget)||0),0);
		const gt_util = budgets.reduce((s,b)=>s+(parseFloat(b.utilisation)||0),0);
		const gt_disb = budgets.reduce((s,b)=>s+(parseFloat(b.disbursement)||0),0);
		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
		const gt_util_of_disb_pct = gt_disb>0?(gt_util/gt_disb*100):0;
		let foot_cells = '';
		if (type==='budget')           foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
		else if (type==='utilisation') foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${gt_util_of_disb_pct.toFixed(1)}%</td>`;
		else foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_util_of_disb_pct.toFixed(1)}%</td>`;

		const thead_html = COLS[type].map(h=>`<th class="cbd-dt__th">${h}</th>`).join('');
		const table_id   = 'cbd_dm_t2';
		const fname      = `${TITLE[type].replace(/\s+/g,'_')}_${pname.replace(/\s+/g,'_')}`;

		const showConsolidated = (type === 'budget' || type === 'utilisation'); // always show at budget level
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

						</tr></thead>
						<tbody>${rows}</tbody>
						<tfoot><tr>
							<td class="cbd-dt__foot">&nbsp;</td>
							<td class="cbd-dt__foot" style="font-weight:800" colspan="4">Total</td>
							${foot_cells}
						</tr></tfoot>
					</table>
				</div>
			</div>`;

		setTimeout(() => this._enhance_table(table_id), 50);

		p2.addEventListener('click', e => {
			// Consolidated button
			const consolidatedBtn = e.target.closest('#cbd_dm_consolidated');
			if (consolidatedBtn) {
				e.stopPropagation();
				this._dm_budget = null;
				this._render_dm_page3(true);
				return;
			}
			// Row click → line items
			const row = e.target.closest('tr.cbd-dt__row[data-bidx]');
			if (!row) return;
			const bidx = parseInt(row.dataset.bidx);
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
		const callArgs = (budget_id) => ({
			budget_id, start_date: pf.start_date||null, end_date: pf.end_date||null,
			financial_year: pf.financial_year ? JSON.stringify(pf.financial_year) : null,
			month: pf.month ? JSON.stringify(pf.month) : null,
		});

		if (type === 'disbursement') {
			// Disbursement view is unchanged — not part of the month-wise redesign.
			const budget_id = consolidated ? null : budget.budget_id;
			const budgetIds = consolidated ? (partner.budgets||[]).map(b=>b.budget_id).filter(Boolean) : [budget_id];
			frappe.call({
				method: 'creche_reports.api.creche_dashboard.get_disbursement_panel_data',
				args: {budget_ids: JSON.stringify(budgetIds), partner_ids: null,
				       start_date: pf.start_date||null, end_date: pf.end_date||null,
				       financial_year: pf.financial_year ? JSON.stringify(pf.financial_year) : null,
				       month: pf.month ? JSON.stringify(pf.month) : null},
				callback: r => this._render_dm_disb_items(r.message||[]),
			});
			return;
		}

		const method = type === 'budget'
			? 'get_budget_line_items'
			: 'get_utilisation_line_items';

		if (consolidated) {
			const budgetIds = (partner.budgets || []).map(b => b.budget_id).filter(Boolean);
			Promise.all(budgetIds.map(budget_id => frappe.call({
				method: `creche_reports.api.creche_dashboard.${method}`,
				args: callArgs(budget_id),
			}))).then(responses => {
				const datasets = responses.map(r => r.message || {months:[], rows:[]});
				const merged = this._merge_monthly_datasets(datasets);
				if (type === 'budget') this._render_dm_budget_items(merged, true);
				else this._render_dm_util_items(merged, true);
			});
			return;
		}

		frappe.call({
			method: `creche_reports.api.creche_dashboard.${method}`,
			args: callArgs(budget.budget_id),
			callback: r => {
				const data = r.message || {months: [], rows: []};
				if (type === 'budget') this._render_dm_budget_items(data);
				else this._render_dm_util_items(data);
			},
		});
	}

	// Union month columns and sum matching rows (by expense type + sub
	// head + main head) across several budgets' {months, rows} datasets.
	// Used for the "Consolidated Line Items" view across all of a
	// partner's budgets.
	_merge_monthly_datasets(datasets) {
		const MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		const monthVal = (label) => {
			const parts = label.split(' ');
			const mi = MON3.indexOf(parts[0]);
			const yr = parseInt(parts[1], 10) || 0;
			return yr * 12 + (mi >= 0 ? mi : 0);
		};

		const allMonths = [];
		datasets.forEach(d => (d.months || []).forEach(m => { if (!allMonths.includes(m)) allMonths.push(m); }));
		allMonths.sort((a, b) => monthVal(a) - monthVal(b));

		const merged = {};
		const order = [];
		datasets.forEach(d => (d.rows || []).forEach(r => {
			const key = [r.type_of_expenses||'—', r.budget_sub_head||'—', r.budget_main_head||'—'].join('||');
			if (!merged[key]) {
				merged[key] = {
					type_of_expenses: r.type_of_expenses, budget_sub_head: r.budget_sub_head,
					budget_main_head: r.budget_main_head, monthly: {}, total: 0,
				};
				order.push(key);
			}
			Object.entries(r.monthly || {}).forEach(([label, v]) => {
				merged[key].monthly[label] = (merged[key].monthly[label] || 0) + (parseFloat(v) || 0);
			});
			merged[key].total += parseFloat(r.total) || 0;
		}));

		return { months: allMonths, rows: order.map(k => merged[k]) };
	}

	_render_dm_budget_items(data, consolidated) {
		const body = document.getElementById('cbd_dm_p3_body');
		if (!body) return;
		body.classList.add('cbd-li-scrollbody');

		const months = data.months || [];
		const items  = data.rows || [];
		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No budget line items found.</div>'; return; }

		const grand = items.reduce((s,r)=>s+(parseFloat(r.total)||0),0);
		const monthTotals = months.map(m => items.reduce((s,r)=>s+(parseFloat((r.monthly||{})[m])||0),0));

		const monthThs   = months.map(m => `<th class="cbd-dt__th cbd-dt__th--r cbd-li__month-col">${frappe.utils.escape_html(m)}</th>`).join('');
		const monthFoots = monthTotals.map(v => `<td class="cbd-dt__r cbd-dt__foot cbd-li__month-col">${this._fmtTip(v, 'Month Total')}</td>`).join('');

		// colCount = # + ExpType + SubHead + one column per month + Total
		const colCount = 3 + months.length + 1;
		const rowHtmlFn = (r, i) => {
			const monthTds = months.map(m => {
				const v = (r.monthly||{})[m];
				return `<td class="cbd-dt__r cbd-li__month-col">${v ? this._fmtTip(v, m) : '—'}</td>`;
			}).join('');
			return `
			<tr class="cbd-dt__row cbd-grp__child-row">
				<td class="cbd-dt__num cbd-dt__indent-num cbd-li__sticky-num">${i+1}</td>
				<td class="cbd-dt__cell-indent cbd-li__sticky-exp">${frappe.utils.escape_html(r.type_of_expenses||'—')}</td>
				<td>${frappe.utils.escape_html(r.budget_sub_head||'—')}</td>
				${monthTds}
				<td class="cbd-dt__r" style="font-weight:800">${this._fmtTip(r.total,'Total')}</td>
			</tr>`;
		};
		const groupedHtml = this._render_main_head_groups(items, rowHtmlFn, r => parseFloat(r.total)||0, colCount, 'Total', false);

		body.innerHTML = `
			<div class="cbd-li__expand-bar">
				<span class="cbd-li__expand-hint">${items.length} line item${items.length===1?'':'s'} · ${months.length} month${months.length===1?'':'s'} (${months[0]||''}${months.length>1?' – '+months[months.length-1]:''})</span>
				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__months-chk" checked> Show months</label>
				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__items-chk" checked> Show line items</label>
			</div>
			<div class="cbd-dm__tbl-wrap">
				<table class="cbd-dt cbd-dt--grouped" id="cbd_dm_t3">
					<thead><tr>
						<th class="cbd-dt__th cbd-dt__th--num cbd-li__sticky-num">#</th>
						<th class="cbd-dt__th cbd-li__sticky-exp">Expense Type</th>
						<th class="cbd-dt__th">Sub Head</th>
						${monthThs}
						<th class="cbd-dt__th cbd-dt__th--r">Total</th>
					</tr></thead>
					<tbody>${groupedHtml}</tbody>
					<tfoot><tr>
						<td class="cbd-dt__foot cbd-li__sticky-num" colspan="3" style="font-weight:800">Total</td>
						${monthFoots}
						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand,'Grand Total')}</td>
					</tr></tfoot>
				</table>
			</div>`;

		this._make_table_sortable('cbd_dm_t3');
		this._sync_li_header_offset('cbd_dm_t3');
		this._wire_li_expand_checkboxes('cbd_dm_t3');
	}

	_render_main_head_groups(items, rowHtmlFn, amtGetter, colCount, amtLabel, showYears) {
		// ── FIX #1 ──
		// Previously this used a plain JS object ({}) keyed by the raw
		// budget_main_head string. That's fragile: any invisible
		// whitespace difference, or a value that happens to collide with
		// something on Object.prototype, can cause an entire category's
		// rows to be silently swallowed — they still get counted in the
		// "N line items" total (which counts the flat `items` array
		// directly) but never get a group header rendered, so the whole
		// category vanishes from the table with no error.
		//
		// Using a Map avoids any object-key ambiguity entirely, and
		// trimming/normalizing the key means differences in surrounding
		// whitespace can no longer split (or hide) a category.
		const groups = new Map();
		items.forEach(r => {
			const raw = r.budget_main_head;
			const key = (raw === null || raw === undefined || String(raw).trim() === '')
				? '—'
				: String(raw).trim();
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key).push(r);
		});

		// Deterministic alphabetical order (case-insensitive); unlabeled
		// items always sort last so they don't visually hide as "first".
		const order = [...groups.keys()].sort((a, b) => {
			if (a === '—') return 1;
			if (b === '—') return -1;
			return a.localeCompare(b, undefined, { sensitivity: 'base' });
		});

		let html = '';
		let groupIdx = 0;
		order.forEach(mainHead => {
			const groupRows = groups.get(mainHead);
			const groupTotal = groupRows.reduce((s, r) => s + amtGetter(r), 0);
			const gid = `cbd_grp_${groupIdx++}_${Math.random().toString(36).slice(2,7)}`;
			// Section divider row — click to expand/collapse just this group.
			html += `
			<tr class="cbd-grp__header-row" data-grp-target="${gid}" title="Click to expand/collapse">
				<td colspan="${colCount}">
					<div class="cbd-grp__header">
						<svg class="cbd-grp__chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
						<span class="cbd-grp__title">${frappe.utils.escape_html(mainHead)}</span>
						<span class="cbd-grp__count">${groupRows.length} item${groupRows.length===1?'':'s'}</span>
						<span class="cbd-grp__subtotal">${this._fmtTip(groupTotal, `${mainHead} — ${amtLabel}`)}</span>
					</div>
				</td>
			</tr>`;
			groupRows.forEach((r, i) => {
				html += rowHtmlFn(r, i).replace('<tr class="cbd-dt__row cbd-grp__child-row">', `<tr class="cbd-dt__row cbd-grp__child-row" data-grp-parent="${gid}">`);
			});
		});

		// Safety net: if this ever mismatches again for any reason, it
		// will show up loudly in the console instead of silently
		// dropping rows.
		const groupedCount = order.reduce((s, k) => s + groups.get(k).length, 0);
		if (groupedCount !== items.length) {
			console.warn(`[Creche Dashboard] Line item grouping mismatch: ${items.length} items in, ${groupedCount} items grouped.`);
		}

		return html;
	}

	_render_dm_util_items(data, consolidated) {
		const body = document.getElementById('cbd_dm_p3_body');
		if (!body) return;
		body.classList.add('cbd-li-scrollbody');

		const months = data.months || [];
		const items  = data.rows || [];
		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No utilisation line items found.</div>'; return; }

		const grand = items.reduce((s,r)=>s+(parseFloat(r.total)||0),0);
		const monthTotals = months.map(m => items.reduce((s,r)=>s+(parseFloat((r.monthly||{})[m])||0),0));

		const monthThs   = months.map(m => `<th class="cbd-dt__th cbd-dt__th--r cbd-li__month-col">${frappe.utils.escape_html(m)}</th>`).join('');
		const monthFoots = monthTotals.map(v => `<td class="cbd-dt__r cbd-dt__foot cbd-li__month-col">${this._fmtTip(v, 'Month Total')}</td>`).join('');

		const colCount = 3 + months.length + 1;
		const rowHtmlFn = (r, i) => {
			const monthTds = months.map(m => {
				const v = (r.monthly||{})[m];
				return `<td class="cbd-dt__r cbd-li__month-col">${v ? this._fmtTip(v, m) : '—'}</td>`;
			}).join('');
			return `<tr class="cbd-dt__row cbd-grp__child-row">
				<td class="cbd-dt__num cbd-dt__indent-num cbd-li__sticky-num">${i+1}</td>
				<td class="cbd-dt__cell-indent cbd-li__sticky-exp">${frappe.utils.escape_html(r.type_of_expenses||'—')}</td>
				<td>${frappe.utils.escape_html(r.budget_sub_head||'—')}</td>
				${monthTds}
				<td class="cbd-dt__r" style="font-weight:800">${this._fmtTip(r.total,'Total')}</td>
			</tr>`;
		};
		const groupedHtml = this._render_main_head_groups(items, rowHtmlFn, r => parseFloat(r.total)||0, colCount, 'Total', false);

		body.innerHTML = `
			<div class="cbd-li__expand-bar">
				<span class="cbd-li__expand-hint">${items.length} line item${items.length===1?'':'s'} · ${months.length} month${months.length===1?'':'s'} (${months[0]||''}${months.length>1?' – '+months[months.length-1]:''})</span>
				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__months-chk" checked> Show months</label>
				<label class="cbd-li__toggle"><input type="checkbox" class="cbd-li__items-chk" checked> Show line items</label>
			</div>
			<div class="cbd-dm__tbl-wrap">
				<table class="cbd-dt cbd-dt--grouped" id="cbd_dm_t3">
					<thead><tr>
						<th class="cbd-dt__th cbd-dt__th--num cbd-li__sticky-num">#</th>
						<th class="cbd-dt__th cbd-li__sticky-exp">Expense Type</th>
						<th class="cbd-dt__th">Sub Head</th>
						${monthThs}
						<th class="cbd-dt__th cbd-dt__th--r">Total</th>
					</tr></thead>
					<tbody>${groupedHtml}</tbody>
					<tfoot><tr>
						<td class="cbd-dt__foot cbd-li__sticky-num" colspan="3" style="font-weight:800">Total</td>
						${monthFoots}
						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand,'Grand Total')}</td>
					</tr></tfoot>
				</table>
			</div>`;

		this._make_table_sortable('cbd_dm_t3');
		this._sync_li_header_offset('cbd_dm_t3');
		this._wire_li_expand_checkboxes('cbd_dm_t3');
	}

	_render_dm_disb_items(records) {
		const body = document.getElementById('cbd_dm_p3_body');
		if (!body) return;
		body.classList.add('cbd-li-scrollbody');
		const entries = [];
		(records||[]).forEach(d => {
			const ref = d.budget_reference_name || '—';
			const tracker = d.tracker || [];
			if (tracker.length) {
				tracker.forEach(t => {
					entries.push({ date: t.date_of_disbursement || '', amount: t.disbursed_amount || 0, ref });
				});
			} else if (parseFloat(d.total_disbursement)) {
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

		setTimeout(() => this._enhance_table('cbd_dm_t3'), 50);
	}

	// ─── Topbar ──────────────────────────────────────────────────────────
	_dm_breadcrumb_names() {
		const type = this._dm_type || 'budget';
		const MAP = {
			budget:              { p1:'Partner Level',         p2:'Budget Level',          p3:'Expense Items Level'   },
			utilisation:         { p1:'Partner Level',         p2:'Budget Level',          p3:'Expense Items Level'   },
			disbursement:        { p1:'Partner Level',         p2:'Budget Level',          p3:'Expense Items Level'   },
			bank_balance:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			expected_bank_bal:   { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			unutilised_disb:     { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			bank_bal_gap:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			remaining_budget:    { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			unspent_disb:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			bank_variance:       { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			pending_util:        { p1:'Partner Level',         p2:'Budget Level',          p3:null                    },
			partners_80pct:      { p1:'Partners with 85%+ Disbursement Utilization', p2:null,                   p3:null                    },
		};
		return MAP[type] || { p1:'Partner Level', p2:'Budget Level', p3:'Expense Items Level' };
	}

	_dm_topbar(title, p2label, p3label, page, tableId, fname) {
		const N = this._dm_breadcrumb_names();

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

	// ─── Export ──────────────────────────────────────────────────────────
	// CHANGE #9: export strips group-band rows and handles indent properly
	// Walks the DOM's actual rowspan attributes to reconstruct a proper
	// grid (with merge ranges) so the exported Excel file has the same
	// merged Partner Name / Total Pending Months / Email cells as the
	// on-screen table, instead of flattening/repeating those values.
	_export_pending_util_table(format) {
		const table = document.getElementById('cbd_pu_table');
		if (!table) { frappe.show_alert({message:'Table not ready', indicator:'orange'}); return; }

		const theadRow = table.querySelector('thead tr');
		const ths = [...theadRow.querySelectorAll('th')];
		// Drop the trailing action column (Send Email button) — not exportable data
		const columns = ths.slice(0, -1).map(th => ({ label: (th.innerText || th.textContent || '').trim() }));
		const numDataCols = columns.length;

		const bodyRows = [...table.querySelectorAll('tbody tr')];
		const grid = [];
		const merges = [];
		const carry = {}; // colIdx -> { remaining, value }

		bodyRows.forEach((tr, rIdx) => {
			const cells = [...tr.children];
			let cellPtr = 0;
			const rowVals = [];
			let colIdx = 0;
			while (colIdx < numDataCols) {
				if (carry[colIdx] && carry[colIdx].remaining > 0) {
					rowVals[colIdx] = '';
					carry[colIdx].remaining--;
					colIdx++;
					continue;
				}
				const td = cells[cellPtr++];
				if (!td) break;
				const rowspan = parseInt(td.getAttribute('rowspan') || '1');
				const val = (td.innerText || td.textContent || '').replace(/\s+/g, ' ').trim();
				rowVals[colIdx] = val;
				if (rowspan > 1) {
					merges.push([rIdx, colIdx, rIdx + rowspan - 1, colIdx]);
					carry[colIdx] = { remaining: rowspan - 1, value: val };
				}
				colIdx++;
			}
			grid.push(rowVals);
		});

		if (format === 'pdf') {
			// PDF layout doesn't preserve cell merges the same way — fall back
			// to the flattened (repeated-value) rows via the generic exporter
			// so the data itself is still complete and correct.
			const rows = grid.map(rowVals => {
				const row = {};
				columns.forEach((c, i) => { row['c'+i] = rowVals[i] ?? ''; });
				return row;
			});
			const cols = columns.map((c, i) => ({ label: c.label, key: 'c'+i, align: 'left' }));
			frappe.show_alert({message:'Generating PDF…', indicator:'blue'}, 2);
			frappe.call({
				method: 'creche_reports.api.creche_dashboard.export_table',
				args: { title: 'Pending Utilization Submission', columns: JSON.stringify(cols), rows: JSON.stringify(rows), format: 'pdf' },
				callback: (r) => {
					if (r.message && r.message.file_url) { window.open(r.message.file_url, '_blank'); frappe.show_alert({message:'Download ready', indicator:'green'}, 3); }
					else frappe.show_alert({message:'Export failed', indicator:'red'});
				},
			});
			return;
		}

		frappe.show_alert({message:'Generating XLSX…', indicator:'blue'}, 2);
		frappe.call({
			method: 'creche_reports.api.creche_dashboard.export_pending_utilisation_grid',
			args: {
				title: 'Pending Utilization Submission',
				columns: JSON.stringify(columns),
				grid: JSON.stringify(grid),
				merges: JSON.stringify(merges),
			},
			callback: (r) => {
				if (r.message && r.message.file_url) { window.open(r.message.file_url, '_blank'); frappe.show_alert({message:'Download ready', indicator:'green'}, 3); }
				else frappe.show_alert({message:'Export failed', indicator:'red'});
			},
		});
	}

	_table_to_columns_rows(tableId) {
		const table = document.getElementById(tableId);
		if (!table) return null;
		const clone = table.cloneNode(true);
		// Reset pagination: make ALL rows visible in clone so export captures full dataset
		clone.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
			if (tr.getAttribute('data-search-hidden') !== '1') tr.style.display = '';
		});
		clone.querySelectorAll('td.cbd-dt__act, .cbd-dt__btn, button').forEach(el => {
			const td = el.closest('td,th'); if (td) td.remove();
		});
		const theadRow = clone.querySelector('thead tr');
		if (!theadRow) return null;
		const ths = [...theadRow.querySelectorAll('th')];
		const _cleanLabel = (s) =>
			(s || '').trim()
				.replace(/[\u2191\u2193\u2195\u21C5\u2B06\u2B07\u21D1\u21D3\u21D5\u21D5⇅↕↑↓\u2912\u2913]+/g, '')
				.trim();
		const columns = ths.map((th, i) => ({
			label: _cleanLabel(th.innerText || th.textContent || ''),
			key: 'c' + i,
			align: th.classList.contains('cbd-dt__th--r') ? 'right' : 'left',
		}));

		// Helper: extract the best value from a <td>.
		// Priority: data-raw attribute on a child span (exact number) > text parsing
		const _cellValue = (td) => {
			// Check for data-raw (set by _fmtTip) — gives the exact number without Cr/L/K
			const rawEl = td.querySelector('[data-raw]');
			if (rawEl) {
				const raw = parseFloat(rawEl.dataset.raw);
				if (!isNaN(raw)) return Math.round(raw * 100) / 100; // 2 decimal places
			}
			// Fallback: parse text
			const txt = (td.innerText || td.textContent || '').replace(/\n/g, ' ').trim();
			if (!txt || txt === '—') return txt;
			const num = parseFloat(txt.replace(/[₹,\s%]/g, ''));
			return (!isNaN(num) && /[\d]/.test(txt)) ? num : txt;
		};

		const rows = [];

		// Group header rows → export as __group__ band row with raw subtotal
		clone.querySelectorAll('tbody tr').forEach(tr => {
			if (tr.style.display === 'none') return;

			if (tr.classList.contains('cbd-grp__header-row')) {
				const titleEl = tr.querySelector('.cbd-grp__title');
				const subEl   = tr.querySelector('.cbd-grp__subtotal');
				const label   = titleEl ? (titleEl.innerText || titleEl.textContent || '').trim() : '';
				// Use raw number from subtotal span if available, else text
				let subtotal;
				if (subEl) {
					const rawEl = subEl.querySelector('[data-raw]');
					subtotal = rawEl ? (parseFloat(rawEl.dataset.raw) || '') : (subEl.innerText || subEl.textContent || '').trim();
				} else { subtotal = ''; }
				rows.push({ __group__: true, label, subtotal });
				return;
			}

			// Use colspan-aware indexing so <td colspan="N"> doesn't shift later cells left
			const tds = [...tr.querySelectorAll('td')];
			const row = {};
			let colIdx = 0;
			tds.forEach(td => {
				const span = parseInt(td.getAttribute('colspan') || '1');
				row[columns[colIdx] ? columns[colIdx].key : ('c'+colIdx)] = _cellValue(td);
				colIdx += span; // advance past all spanned columns
			});
			rows.push(row);
		});

		// Footer rows — same colspan-aware approach
		clone.querySelectorAll('tfoot tr').forEach(tr => {
			const tds = [...tr.querySelectorAll('td')];
			const row = {};
			let colIdx = 0;
			tds.forEach(td => {
				const span = parseInt(td.getAttribute('colspan') || '1');
				row[columns[colIdx] ? columns[colIdx].key : ('c'+colIdx)] = _cellValue(td);
				colIdx += span;
			});
			rows.push(row);
		});

		return { columns, rows };
	}

	_export_table(tableId, fname, title, format) {
		if (tableId === 'cbd_pu_table') { this._export_pending_util_table(format); return; }
		const data = this._table_to_columns_rows(tableId);
		if (!data || !data.rows.length) {
			frappe.show_alert({message:'Table not ready', indicator:'orange'}); return;
		}
		frappe.show_alert({message:`Generating ${format.toUpperCase()}…`, indicator:'blue'}, 2);
		frappe.call({
			method: 'creche_reports.api.creche_dashboard.export_table',
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

	_filter_table_rows(tableId, query) {
		const table = document.getElementById(tableId);
		if (!table) return;
		this._filter_one_table(table, query);
	}

	_filter_one_table(table, query) {
		const q = (query || '').trim().toLowerCase();
		table.querySelectorAll('tbody tr').forEach(tr => {
			if (!q) {
				tr.style.display = tr.dataset.paginationHidden === '1' ? 'none' : '';
				tr.removeAttribute('data-search-hidden');
				return;
			}
			const hidden = !tr.innerText.toLowerCase().includes(q);
			tr.style.display = hidden ? 'none' : '';
			if (hidden) tr.setAttribute('data-search-hidden', '1');
			else tr.removeAttribute('data-search-hidden');
		});
	}

	// Some modals (e.g. the states map view, which pairs a map with its own
	// data table) can contain more than one table — filter all of them from
	// a single search box rather than requiring one box per table.
	_filter_all_tables_in(containerEl, query) {
		if (!containerEl) return;
		containerEl.querySelectorAll('table').forEach(table => this._filter_one_table(table, query));
	}

	// ─────────────────────────────────────────────────────────────────────────
	// BUDGET MODAL
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
		// Build rich state data: {state, partners, approved_creches, running_creches}
		const _stateMap = {};
		partners.forEach(p => {
			(p.budgets||[]).forEach(b => {
				if (!b.state) return;
				if (!_stateMap[b.state]) _stateMap[b.state] = { state: b.state, partnerSet: new Set(), approved_creches: 0, running_creches: 0 };
				_stateMap[b.state].partnerSet.add(p.partner_name || p.partner_id || '');
				_stateMap[b.state].approved_creches += parseInt(b.no_of_creches || 0);
				_stateMap[b.state].running_creches  += parseInt(b.running_creches || 0);
			});
		});
		const all_states_data = Object.values(_stateMap).map(s => ({
			state: s.state,
			partners: s.partnerSet.size,
			approved_creches: s.approved_creches,
			running_creches:  s.running_creches,
		})).sort((a,b) => a.state.localeCompare(b.state));
		const all_states = all_states_data.map(s => s.state); // keep for backward compat count

		// Rich district data: {district, state, partners, approved_creches, running_creches}
		const _distMap = {};
		partners.forEach(p => {
			(p.budgets||[]).forEach(b => {
				if (!b.district) return;
				const key = (b.state||'') + '||' + b.district;
				if (!_distMap[key]) _distMap[key] = { district: b.district, state: b.state||'', partnerSet: new Set(), approved: 0, running: 0 };
				_distMap[key].partnerSet.add(p.partner_name || '');
				_distMap[key].approved += parseInt(b.no_of_creches || 0);
				_distMap[key].running  += parseInt(b.running_creches || 0);
			});
		});
		const all_districts_data = Object.values(_distMap)
			.map(d => ({ district: d.district, state: d.state, partners: d.partnerSet.size, approved_creches: d.approved, running_creches: d.running }))
			.sort((a,b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district));
		const all_districts = all_districts_data.map(d => d.district);

		// Rich block data: {block, district, state, partners, approved_creches, running_creches}
		const _blockMap = {};
		partners.forEach(p => {
			(p.budgets||[]).forEach(b => {
				if (!b.block) return;
				const key = (b.state||'') + '||' + (b.district||'') + '||' + b.block;
				if (!_blockMap[key]) _blockMap[key] = { block: b.block, district: b.district||'', state: b.state||'', partnerSet: new Set(), approved: 0, running: 0 };
				_blockMap[key].partnerSet.add(p.partner_name || '');
				_blockMap[key].approved += parseInt(b.no_of_creches || 0);
				_blockMap[key].running  += parseInt(b.running_creches || 0);
			});
		});
		const all_blocks_data = Object.values(_blockMap)
			.map(b => ({ block: b.block, district: b.district, state: b.state, partners: b.partnerSet.size, approved_creches: b.approved, running_creches: b.running }))
			.sort((a,b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district) || a.block.localeCompare(b.block));
		const all_blocks = all_blocks_data.map(b => b.block);

		const partner_rows = partners.map(p => ({ name: p.partner_name }));
		const budget_rows = partners.flatMap(p =>
			(p.budgets||[]).map(b => ({ ref: b.budget_reference_name, creches: b.no_of_creches || 0 }))
		);

		const stats = [
			{
				key:'partners', value:num_partners, rawCount: num_partners,
				label:'Partner'+(num_partners!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
				drillData: partner_rows, drillType: 'partners',
			},
			{
				key:'budgets', value:num_budgets, rawCount: num_budgets,
				label:'Allocated Budget'+(num_budgets!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
				drillData: budget_rows, drillType: 'budgets',
			},
			{
				key:'creches', value:total_creches.toLocaleString('en-IN'), rawCount: total_creches,
				label:'Approved Creche'+(total_creches!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
				drillData: budget_rows, drillType: 'creches',
			},
			{
				key:'states', value:all_states.length, rawCount: all_states.length,
				label:'Working State'+(all_states.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
				drillData: all_states_data, drillType: 'states',
			},
			{
				key:'districts', value:all_districts.length, rawCount: all_districts.length,
				label:'District'+(all_districts.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
				drillData: all_districts_data, drillType: 'districts',
			},
			{
				key:'blocks', value:all_blocks.length, rawCount: all_blocks.length,
				label:'Block'+(all_blocks.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
				drillData: all_blocks_data, drillType: 'blocks',
			},
		];

		const OSTAT_PALETTE = {
			partners:   { color:'#1e3a5f', ibg:'#e8f0fe' },
			budgets:    { color:'#1e3a5f', ibg:'#e8f0fe' },
			creches:    { color:'#1e3a5f', ibg:'#e8f0fe' },
			states:     { color:'#1e3a5f', ibg:'#e8f0fe' },
			districts:       { color:'#1e3a5f', ibg:'#e8f0fe' },
			blocks:          { color:'#1e3a5f', ibg:'#e8f0fe' },
			partners_80pct:  { color:'#15803d', ibg:'#dcfce7' },
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
		const accentMap = { partners:'indigo', budgets:'blue', creches:'teal', states:'orange', districts:'violet', blocks:'rose', partners_80pct:'teal' };
		const accent = accentMap[stat.drillType] || 'blue';

		const showSearch = stat.drillType !== 'states';

		wrap.innerHTML = `
			<div class="cbd-drill-modal ${stat.drillType === 'states' ? 'cbd-drill-modal--full' : 'cbd-drill-modal--narrow'} cbd-drill-modal--${accent}">
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
				${showSearch ? `<div class="cbd-drill-modal__searchbar">
					<div class="cbd-dm__search">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<input type="text" class="cbd-dm__search-input" id="cbd_drill_search" placeholder="Search...">
					</div>
				</div>` : ''}
				<div class="cbd-drill-modal__body">${this._build_ostat_content(stat)}</div>
				<div class="cbd-drill-modal__footer">
					<button class="btn btn-default btn-sm" id="cbd_drill_footer_close">Close</button>
				</div>
			</div>`;

		document.body.appendChild(wrap);
		wrap.addEventListener('click', (e) => { if (e.target === wrap) this._close_drill_panel(); });
		wrap.querySelector('#cbd_drill_close').addEventListener('click', () => this._close_drill_panel());
		wrap.querySelector('#cbd_drill_footer_close').addEventListener('click', () => this._close_drill_panel());
		const drillSearch = wrap.querySelector('#cbd_drill_search');
		if (drillSearch) {
			drillSearch.addEventListener('input', () => {
				this._filter_all_tables_in(wrap.querySelector('.cbd-drill-modal__body'), drillSearch.value);
			});
		}
		this._drill_key_handler = (e) => { if (e.key === 'Escape') this._close_drill_panel(); };
		document.addEventListener('keydown', this._drill_key_handler);
		requestAnimationFrame(() => wrap.classList.add('cbd-drill-modal-wrap--open'));

		// Make every table in this modal sortable, whatever type of list
		// it turned out to be (partners/budgets/creches/states/etc). The
		// states map's own table wires itself once its async geo data
		// loads, so skip re-wiring it here to avoid a stale early pass.
		setTimeout(() => {
			wrap.querySelectorAll('table').forEach(t => {
				if (!t.id) t.id = 'cbd_dt2_auto_' + Math.random().toString(36).slice(2, 8);
				this._make_table_sortable(t.id);
			});
		}, 80);
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

		if (!drillData || !drillData.length)
			return '<div class="cbd-drill-empty">No data available.</div>';

		const PALETTE = {
			partners:  { hdr:'#4F46E5', hdrText:'#fff',  badge:'#EEF2FF', badgeText:'#3730A3', dot:'#818CF8' },
			budgets:   { hdr:'#0369A1', hdrText:'#fff',  badge:'#E0F2FE', badgeText:'#075985', dot:'#38BDF8' },
			creches:   { hdr:'#0D9488', hdrText:'#fff',  badge:'#CCFBF1', badgeText:'#115E59', dot:'#2DD4BF' },
			states:    { hdr:'#B45309', hdrText:'#fff',  badge:'#FEF3C7', badgeText:'#92400E', dot:'#FBBF24' },
			districts: { hdr:'#7C3AED', hdrText:'#fff',  badge:'#EDE9FE', badgeText:'#4C1D95', dot:'#A78BFA' },
			blocks:    { hdr:'#BE185D', hdrText:'#fff',  badge:'#FCE7F3', badgeText:'#831843', dot:'#F472B6' },
			partners_80pct:  { hdr:'#15803D', hdrText:'#fff', badge:'#DCFCE7', badgeText:'#166534', dot:'#4ADE80' },
		};
		const p = PALETTE[drillType] || PALETTE.partners;

		if (drillType === 'partners_80pct') {
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.name || '—')}</td>
					<td class="cbd-dt2__cell" style="text-align:right">${this._fmtTip(item.disb,'Disbursed')}</td>
					<td class="cbd-dt2__cell" style="text-align:right">${this._fmtTip(item.util,'Utilised')}</td>
					<td class="cbd-dt2__badge-cell">
						<span class="cbd-dt2__pill" style="background:${p.badge};color:${p.badgeText};border-color:${p.dot}">${item.pct.toFixed(1)}%</span>
					</td>
				</tr>`).join('');
			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr>
						<th class="cbd-dt2__th-num">#</th>
						<th class="cbd-dt2__th">Partner Name</th>
						<th class="cbd-dt2__th cbd-dt2__th--r">Disbursed</th>
						<th class="cbd-dt2__th cbd-dt2__th--r">Utilised</th>
						<th class="cbd-dt2__th cbd-dt2__th--r">% of Disbursed</th>
					</tr></thead>
					<tbody>${rows}</tbody></table>`;
		}

		if (drillType === 'partners') {
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.name)}</td>
				</tr>`).join('');
			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr><th class="cbd-dt2__th-num">#</th><th class="cbd-dt2__th">Partner Name</th></tr></thead>
					<tbody>${rows}</tbody></table>`;
		}

		if (drillType === 'budgets') {
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
				</tr>`).join('');
			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr><th class="cbd-dt2__th-num">#</th><th class="cbd-dt2__th">Budget Reference</th></tr></thead>
					<tbody>${rows}</tbody></table>`;
		}

		if (drillType === 'creches') {
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
					<td class="cbd-dt2__badge-cell">
						${item.creches ? `<span class="cbd-dt2__pill" style="background:${p.badge};color:${p.badgeText};border-color:${p.dot}">${item.creches.toLocaleString('en-IN')}</span>` : '—'}
					</td>
				</tr>`).join('');
			return `<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr><th class="cbd-dt2__th-num">#</th><th class="cbd-dt2__th">Budget Reference</th><th class="cbd-dt2__th cbd-dt2__th--r">Creches</th></tr></thead>
					<tbody>${rows}</tbody></table>`;
		}

		// ── States: India Tile Map + table ─────────────────────────────────
		if (drillType === 'states') {
			return this._render_india_tile_map(drillData);
		}

		if (drillType === 'districts') return this._render_geo_panel(drillData, 'districts');
		if (drillType === 'blocks')    return this._render_geo_panel(drillData, 'blocks');

		return '<div class="cbd-drill-empty">No details available.</div>';
	}

	// ══════════════════════════════════════════════════════════════════
	// GEOGRAPHIC MAP: Unified colorful map for States / Districts / Blocks
	// ══════════════════════════════════════════════════════════════════

	// 20 vibrant distinct colors
	_GEO_PALETTE() {
		// Outer = fill color (light), each has a matching darker text/border color
		return [
			'#60a5fa','#34d399','#fb923c','#a78bfa','#f472b6',
			'#38bdf8','#4ade80','#fbbf24','#f87171','#2dd4bf',
			'#818cf8','#86efac','#fdba74','#c084fc','#6ee7b7',
			'#93c5fd','#fcd34d','#d8b4fe','#67e8f9','#fda4af',
		];
	}

	_render_geo_panel(data, type) {
		const isBlock  = type === 'blocks';
		const geoTblId = 'cbd_geo_tbl_' + Math.random().toString(36).slice(2,7);
		const PALETTE  = this._GEO_PALETTE();
		const stateSet = new Set(data.map(d=>d.state).filter(Boolean));
		const distSet  = new Set(data.map(d=>d.district).filter(Boolean));
		const totalApproved = data.reduce((s,d)=>s+(d.approved_creches||0),0);
		const stateColors = {};
		[...stateSet].sort().forEach((s,i) => stateColors[s] = PALETTE[i % PALETTE.length]);
		const sorted = [...data].sort((a,b)=>(a.state||"").localeCompare(b.state||"")
			||(a.district||"").localeCompare(b.district||"")
			||(a.block||"").localeCompare(b.block||""));
		const rows = sorted.map((d,i)=>{
			const clr = stateColors[d.state]||'#94a3b8';
			const nm  = isBlock ? d.block : d.district;
			return `<tr>
				<td style="padding:7px 10px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
				<td style="padding:7px 10px;font-size:12px;font-weight:600;border-bottom:1px solid #f3f4f6">${frappe.utils.escape_html(nm||'—')}</td>
				${isBlock?`<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #f3f4f6">${frappe.utils.escape_html(d.district||'—')}</td>`:''}
				<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #f3f4f6">
					<span style="display:inline-flex;align-items:center;gap:5px">
						<span style="width:8px;height:8px;border-radius:2px;background:${clr};flex-shrink:0"></span>
						${frappe.utils.escape_html(d.state||'—')}
					</span>
				</td>
				<td style="padding:7px 10px;font-size:12px;text-align:right;border-bottom:1px solid #f3f4f6">${d.partners||0}</td>
				<td style="padding:7px 10px;font-size:12px;text-align:right;color:#1d4ed8;font-weight:600;border-bottom:1px solid #f3f4f6">${(d.approved_creches||0).toLocaleString('en-IN')}</td>
			</tr>`;
		}).join('');
		const cs = isBlock?4:3;
		const html_geo = `<div style="font-family:inherit">
			<div style="display:flex;gap:8px;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
				<div style="flex:1;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:7px 10px;text-align:center">
					<div style="font-size:18px;font-weight:800;color:#2563eb">${stateSet.size}</div><div style="font-size:10px;color:#3b82f6;text-transform:uppercase">States</div></div>
				${isBlock?`<div style="flex:1;background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:10px;padding:7px 10px;text-align:center"><div style="font-size:18px;font-weight:800;color:#7c3aed">${distSet.size}</div><div style="font-size:10px;color:#8b5cf6;text-transform:uppercase">Districts</div></div>`:''}
				<div style="flex:1;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:7px 10px;text-align:center">
					<div style="font-size:18px;font-weight:800;color:#16a34a">${data.length}</div><div style="font-size:10px;color:#22c55e;text-transform:uppercase">${isBlock?'Blocks':'Districts'}</div></div>
			</div>
			<div style="max-height:420px;overflow-y:auto">
				<table id="${geoTblId}" style="width:100%;border-collapse:collapse">
					<thead><tr style="background:#f9fafb;position:sticky;top:0;z-index:2">
						<th class="cbd-dt__th--num" style="padding:8px 10px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:center;width:36px">#</th>
						<th style="padding:8px 10px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:left">${isBlock?'Block':'District'}</th>
						${isBlock?'<th style="padding:8px 10px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:left">District</th>':''}
						<th style="padding:8px 10px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:left">State</th>
						<th style="padding:8px 10px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:right">Partners</th>
						<th style="padding:8px 10px;font-size:11px;color:#1d4ed8;border-bottom:2px solid #e5e7eb;font-weight:700;text-align:right">Approved</th>
				</tr></thead>
				<tbody>${rows}</tbody>
				<tfoot><tr style="background:#f9fafb">
					<td colspan="${cs}" style="padding:8px 10px;font-size:12px;font-weight:700;border-top:2px solid #e5e7eb">Total</td>
					<td style="padding:8px 10px;border-top:2px solid #e5e7eb"></td>
					<td style="padding:8px 10px;font-size:12px;font-weight:700;color:#1d4ed8;text-align:right;border-top:2px solid #e5e7eb">${totalApproved.toLocaleString('en-IN')}</td>
			</tr></tfoot>
			</table></div></div>`;
		// ── FIX #4 ──
		// This function built `html_geo` but never returned it, so every
		// caller (District and Block drill-downs) received `undefined`
		// back from `_build_ostat_content`, which was then concatenated
		// straight into the modal body as the literal text "undefined".
		return html_geo;
	}

		_render_india_tile_map(stateData) { return this._render_states_chart_map(stateData); }
	/* ─── India Colorful Political Map (States) ──────────────────────── */
	_render_states_chart_map(stateData) {
		const mapId   = 'cbd_smap_' + Math.random().toString(36).slice(2, 7);
		const PALETTE = this._GEO_PALETTE();

		// Assign distinct color per active state
		const activeMap = new Map();
		(stateData || []).forEach((d, i) => {
			activeMap.set(d.state, {
				color:            PALETTE[i % PALETTE.length],
				approved_creches: d.approved_creches || 0,
				partners:         d.partners          || 0,
			});
		});

		const ALIASES = { 'Orissa':'Odisha', 'Uttaranchal':'Uttarakhand', 'Pondicherry':'Puducherry' };

		// Totals for footer table
		const totalApproved = (stateData||[]).reduce((s,d)=>s+(d.approved_creches||0),0);

		// Table rows
		const tableRows = (stateData||[]).map((s,i) => {
			const clr = activeMap.get(s.state)?.color || '#94a3b8';
			return `<tr>
				<td style="padding:7px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
				<td style="padding:7px 12px;font-size:12px;font-weight:600;border-bottom:1px solid #f3f4f6">
					<span style="display:inline-flex;align-items:center;gap:7px">
						<span style="width:12px;height:12px;border-radius:3px;background:${clr};flex-shrink:0"></span>
						${frappe.utils.escape_html(s.state)}
					</span>
				</td>
				<td style="padding:7px 12px;font-size:12px;text-align:right;border-bottom:1px solid #f3f4f6">${s.partners}</td>
				<td style="padding:7px 12px;font-size:12px;text-align:right;color:#1d4ed8;font-weight:600;border-bottom:1px solid #f3f4f6">${(s.approved_creches||0).toLocaleString('en-IN')}</td>
			</tr>`;
		}).join('');

		const html = `
			<div style="background:#fff;font-family:inherit">

				<!-- Map — fixed 380px -->
				<div id="${mapId}"
				     style="height:520px;position:relative;overflow:hidden;
				            background:linear-gradient(180deg,#e0f2fe 0%,#bae6fd 100%)">
					<div id="${mapId}_l"
					     style="position:absolute;inset:0;display:flex;align-items:center;
					            justify-content:center;flex-direction:column;gap:10px">
						<div style="width:36px;height:36px;border:4px solid #bfdbfe;
						            border-top-color:#2563eb;border-radius:50%;
						            animation:cbd-spin .8s linear infinite"></div>
						<span style="font-size:12px;color:#2563eb;font-weight:500">Loading India map…</span>
					</div>
					<div id="${mapId}_tip"
					     style="display:none;position:absolute;padding:10px 14px;
					            background:rgba(15,23,42,.93);color:#fff;border-radius:10px;
					            font-size:12px;pointer-events:none;z-index:10;max-width:210px;
					            line-height:1.6;box-shadow:0 8px 24px rgba(0,0,0,.3)"></div>
				</div>

				<!-- Data table -->
				<div style="max-height:220px;overflow-y:auto;border-top:2px solid #e2e8f0">
					<table style="width:100%;border-collapse:collapse">
						<thead>
							<tr style="background:#f9fafb;position:sticky;top:0;z-index:2">
								<th class="cbd-dt__th--num" style="padding:8px 12px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:center;width:36px">#</th>
								<th style="padding:8px 12px;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:700">State</th>
								<th style="padding:8px 12px;font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:right">Partners</th>
								<th style="padding:8px 12px;font-size:11px;color:#1d4ed8;border-bottom:2px solid #e5e7eb;text-align:right;font-weight:700">Approved</th>
							</tr>
						</thead>
						<tbody>${tableRows}</tbody>
						<tfoot>
							<tr style="background:#f9fafb">
								<td colspan="3" style="padding:8px 12px;font-size:12px;font-weight:700;border-top:2px solid #e5e7eb">Total</td>
								<td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1d4ed8;text-align:right;border-top:2px solid #e5e7eb">${totalApproved.toLocaleString('en-IN')}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>`;

		const statesTableId = mapId + '_tbl';
		// Wire table ID so we can paginate after render
		const _htmlWithId = html.replace('<table style="width:100%;border-collapse:collapse">',
			`<table id="${statesTableId}" style="width:100%;border-collapse:collapse">`);
		const _finalHtml = _htmlWithId !== html ? _htmlWithId : html; // use patched if replaced

		setTimeout(() =>
			fetch('https://cdn.jsdelivr.net/npm/@svg-maps/india@2.0.0/india.svg')
				.then(r => r.text())
				.then(svgText => {
					this._draw_states_svg_map(svgText, mapId, activeMap, ALIASES);
					// Paginate the states data table after map renders
					setTimeout(() => this._enhance_table(statesTableId), 100);
				})
				.catch(err => {
					const l = document.getElementById(mapId + '_l');
					if (l) l.innerHTML = `<div style="color:#f87171;font-size:12px;text-align:center;padding:20px">
						<div style="font-size:28px">🗺</div>
						<strong>Map could not load</strong><br>
						<span style="font-size:10px;opacity:.7">${frappe.utils.escape_html(err.message)}</span>
					</div>`;
				})
		, 60);
		return _finalHtml;
	}

	// Renders India using the pre-drawn state paths from the @svg-maps/india
	// package (same source as embedded in the reference site) rather than a
	// geojson + d3 projection — the paths are already in SVG screen-space,
	// so we just recolor and re-parent them into our own <svg>.
	_draw_states_svg_map(svgText, mapId, activeMap, aliases) {
		const wrapper = document.getElementById(mapId);
		const loader  = document.getElementById(mapId + '_l');
		const tipEl   = document.getElementById(mapId + '_tip');
		if (!wrapper) return;

		const NS = 'http://www.w3.org/2000/svg';
		const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
		const sourcePaths = Array.from(parsed.querySelectorAll('path[aria-label]'));

		const SHORT = {
			'Andaman and Nicobar Islands':'A&N', 'Jammu and Kashmir':'J&K',
			'Madhya Pradesh':'M.P.', 'Himachal Pradesh':'H.P.',
			'Uttar Pradesh':'U.P.', 'Dadra and Nagar Haveli':'DNH',
			'Daman and Diu':'D&D', 'Chandigarh':'Ch.',
			'Lakshadweep':'Lk.', 'Puducherry':'Py.', 'Andhra Pradesh':'A.P.',
			'Telangana':'T.S.', 'Arunachal Pradesh':'Ar.', 'Chhattisgarh':'C.G.',
			'West Bengal':'W.B.', 'Tamil Nadu':'T.N.', 'Uttarakhand':'UK',
		};

		const resolve = (name) => {
			if (activeMap.has(name)) return { name, ...activeMap.get(name) };
			const a = aliases[name];
			if (a && activeMap.has(a)) return { name: a, ...activeMap.get(a) };
			const _norm = s => s.toLowerCase().replace(/&/g, 'and').replace(/[\s.]+/g, '');
			const nl = _norm(name);
			for (const [k, v] of activeMap) {
				if (_norm(k) === nl) return { name: k, ...v };
			}
			return null;
		};

		const svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('viewBox', '0 0 612 696');
		svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		svg.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0';

		const defs = document.createElementNS(NS, 'defs');
		defs.innerHTML = `<style>@keyframes cbd-spin{to{transform:rotate(360deg)}}</style>`;
		svg.appendChild(defs);

		const gStates = document.createElementNS(NS, 'g');
		const gLabels = document.createElementNS(NS, 'g');
		svg.appendChild(gStates);
		svg.appendChild(gLabels);

		const labelTargets = []; // { path, data, rawName } — active states only

		sourcePaths.forEach(srcPath => {
			const rawName = srcPath.getAttribute('aria-label') || '';
			const data = resolve(rawName);
			const fill = data ? data.color : '#d1d5db';

			const path = document.createElementNS(NS, 'path');
			path.setAttribute('d', srcPath.getAttribute('d'));
			path.setAttribute('fill', fill);
			path.setAttribute('stroke', '#ffffff');
			path.setAttribute('stroke-width', '1');
			path.style.cssText = 'transition:fill .2s,transform .2s;transform-origin:center;transform-box:fill-box;cursor:' + (data ? 'pointer' : 'default');
			if (data) {
				path.addEventListener('mouseenter', () => {
					path.setAttribute('fill', '#1d9ad6');
					path.style.transform = 'translateY(-2px)';
					if (tipEl) {
						tipEl.innerHTML = `
							<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
								<span style="width:12px;height:12px;border-radius:3px;background:${data.color};flex-shrink:0"></span>
								<strong style="font-size:13px">${frappe.utils.escape_html(data.name)}</strong>
							</div>
							<div style="font-size:11px;display:grid;grid-template-columns:auto auto;gap:3px 12px">
								<span style="opacity:.8">Partners</span><strong>${data.partners}</strong>
								<span style="opacity:.8">Approved</span><strong style="color:#93c5fd">${data.approved_creches.toLocaleString('en-IN')}</strong>
							</div>`;
						tipEl.classList.add('show');
						tipEl.style.display = 'block';
					}
				});
				path.addEventListener('mousemove', (e) => {
					if (!tipEl) return;
					const r = wrapper.getBoundingClientRect();
					tipEl.style.left = (e.clientX - r.left) + 'px';
					tipEl.style.top  = (e.clientY - r.top) + 'px';
				});
				path.addEventListener('mouseleave', () => {
					path.setAttribute('fill', fill);
					path.style.transform = '';
					if (tipEl) { tipEl.classList.remove('show'); tipEl.style.display = 'none'; }
				});
				labelTargets.push({ path, data, rawName });
			}
			gStates.appendChild(path);
		});

		if (loader) loader.remove();
		wrapper.appendChild(svg);

		// State name labels — added now that the SVG is attached to the
		// DOM, since getBBox() needs the paths to actually be laid out.
		labelTargets.forEach(({ path, data, rawName }) => {
			try {
				const bbox = path.getBBox();
				const cx = bbox.x + bbox.width / 2;
				const cy = bbox.y + bbox.height / 2;
				const area = bbox.width * bbox.height;
				if (area < 25) return; // too small to fit any label legibly
				const label = SHORT[rawName] || rawName;
				const words = label.split(' ');
				const fs = area > 3000 ? 11 : area > 800 ? 9 : 7;
				const lineH = fs + 1.5;
				const startY = -((words.length - 1) * lineH) / 2;

				const g = document.createElementNS(NS, 'g');
				g.setAttribute('transform', `translate(${cx},${cy})`);
				g.setAttribute('pointer-events', 'none');
				words.forEach((word, wi) => {
					const t = document.createElementNS(NS, 'text');
					t.setAttribute('text-anchor', 'middle');
					t.setAttribute('y', startY + wi * lineH + fs * 0.35);
					t.setAttribute('font-size', fs);
					t.setAttribute('font-weight', '700');
					t.setAttribute('fill', '#fff');
					t.setAttribute('font-family', 'inherit');
					t.setAttribute('stroke', 'rgba(0,0,0,.35)');
					t.setAttribute('stroke-width', '2.5');
					t.setAttribute('paint-order', 'stroke');
					t.setAttribute('stroke-linejoin', 'round');
					t.textContent = word;
					g.appendChild(t);
				});
				gLabels.appendChild(g);
			} catch (_) {}
		});
	}

	_draw_states_d3_map_UNUSED(_d3, geo, mapId, activeMap, aliases) {
		const wrapper = document.getElementById(mapId);
		const loader  = document.getElementById(mapId + '_l');
		const tipEl   = document.getElementById(mapId + '_tip');
		if (!wrapper) return;

		const W = wrapper.offsetWidth  || 520;
		const H = wrapper.offsetHeight || 380;

		// Short labels for map (to avoid clutter). Keyed on the raw text
		// straight from the geojson source (STNAME_SH uses "&").
		const SHORT = {
			'Andaman & Nicobar':'A&N', 'Jammu & Kashmir':'J&K', 'Ladakh':'Lad.',
			'Madhya Pradesh':'M.P.', 'Himachal Pradesh':'H.P.',
			'Uttar Pradesh':'U.P.', 'Dadra & Nagar Haveli':'DNH',
			'Daman & Diu':'D&D', 'Chandigarh':'Ch.',
			'Lakshadweep':'Lk.', 'Puducherry':'Py.',
			'Pondicherry':'Py.', 'Andhra Pradesh':'A.P.',
			'Telangana':'T.S.',
			'Arunachal Pradesh':'Ar.', 'Chhattisgarh':'C.G.',
			'West Bengal':'W.B.', 'Tamil Nadu':'T.N.',
			'Uttaranchal':'UK', 'Uttarakhand':'UK',
		};

		const resolve = (name) => {
			if (activeMap.has(name)) return { name, ...activeMap.get(name) };
			const a = aliases[name];
			if (a && activeMap.has(a)) return { name: a, ...activeMap.get(a) };
			// Normalize '&' vs 'and' and punctuation/whitespace differences
			// (e.g. geojson "Jammu & Kashmir" vs dashboard data "Jammu and
			// Kashmir") rather than needing an exhaustive alias for every
			// state spelled either way.
			const _norm = s => s.toLowerCase().replace(/&/g, 'and').replace(/[\s.]+/g, '');
			const nl = _norm(name);
			for (const [k, v] of activeMap) {
				if (_norm(k) === nl) return { name: k, ...v };
			}
			return null;
		};

		const proj   = _d3.geoMercator().fitSize([W - 8, H - 8], geo);
		const pathFn = _d3.geoPath().projection(proj);
		const NS     = 'http://www.w3.org/2000/svg';

		const svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('width', W);
		svg.setAttribute('height', H);
		svg.style.cssText = 'display:block;position:absolute;inset:0';

		const defs = document.createElementNS(NS, 'defs');
		defs.innerHTML = `
			<filter id="${mapId}_sh">
				<feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.2"/>
			</filter>
			<style>@keyframes cbd-spin{to{transform:rotate(360deg)}}</style>`;
		svg.appendChild(defs);

		const gStates = document.createElementNS(NS, 'g');
		gStates.setAttribute('transform', 'translate(4,4)');
		svg.appendChild(gStates);

		const gLabels = document.createElementNS(NS, 'g');
		gLabels.setAttribute('transform', 'translate(4,4)');
		svg.appendChild(gLabels);

		// Inactive states get a muted but still visible color
		const INACTIVE_COLORS = [
			'#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0',
			'#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0','#e2e8f0',
		];
		let inactiveIdx = 0;

		geo.features.forEach(feat => {
			const raw  = feat.properties.STNAME_SH || feat.properties.STNAME || '';
			const data = resolve(raw);
			const dStr = pathFn(feat);
			if (!dStr) return;

			const fill   = data ? data.color : '#d1d5db';
			const stroke = '#ffffff';

			const path = document.createElementNS(NS, 'path');
			path.setAttribute('d', dStr);
			path.setAttribute('fill', fill);
			path.setAttribute('stroke', stroke);
			path.setAttribute('stroke-width', data ? '1' : '0.5');
			path.style.transition = 'fill .15s';
			path.style.cursor = data ? 'pointer' : 'default';
			if (data) path.setAttribute('filter', `url(#${mapId}_sh)`);

			if (data) {
				const darkerFill = _d3.color(fill).darker(0.35).toString();
				path.addEventListener('mouseenter', () => {
					path.setAttribute('fill', darkerFill);
					if (tipEl) {
						tipEl.innerHTML = `
							<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
								<span style="width:12px;height:12px;border-radius:3px;background:${data.color};flex-shrink:0"></span>
								<strong style="font-size:13px">${frappe.utils.escape_html(data.name)}</strong>
							</div>
							<div style="font-size:11px;display:grid;grid-template-columns:auto auto;gap:3px 12px">
								<span style="opacity:.8">Partners</span><strong>${data.partners}</strong>
								<span style="opacity:.8">Approved</span><strong style="color:#93c5fd">${data.approved_creches.toLocaleString('en-IN')}</strong>
							</div>`;
						tipEl.style.display = 'block';
					}
				});
				path.addEventListener('mousemove', ev => {
					if (!tipEl) return;
					const rc = wrapper.getBoundingClientRect();
					tipEl.style.left = Math.min(ev.clientX-rc.left+12, rc.width-215)+'px';
					tipEl.style.top  = Math.max(ev.clientY-rc.top-10, 4)+'px';
				});
				path.addEventListener('mouseleave', () => {
					path.setAttribute('fill', fill);
					if (tipEl) tipEl.style.display = 'none';
				});
			}

			gStates.appendChild(path);
		});

		// Draw state name labels in a second pass (on top of all shapes)
		geo.features.forEach(feat => {
			const raw  = feat.properties.STNAME_SH || feat.properties.STNAME || '';
			const data = resolve(raw);
			try {
				const [cx, cy] = pathFn.centroid(feat);
				if (isNaN(cx) || isNaN(cy)) return;
				const dStr = pathFn(feat);
				if (!dStr) return;

				// Compute rough area to decide font size
				const area    = pathFn.area(feat);
				const label   = SHORT[raw] || raw;
				const words   = label.split(' ');
				const fs      = data ? (area > 3000 ? 9 : area > 800 ? 7.5 : 6) : (area > 3000 ? 7 : 5.5);
				const fill    = data ? '#fff' : 'rgba(0,0,0,0.35)';
				const weight  = data ? '700' : '400';

				const tg = document.createElementNS(NS, 'g');
				tg.setAttribute('transform', `translate(${cx},${cy})`);
				tg.setAttribute('pointer-events', 'none');

				const lineH = fs + 1.5;
				const startY = -((words.length - 1) * lineH) / 2;
				words.forEach((word, wi) => {
					const t = document.createElementNS(NS, 'text');
					t.setAttribute('text-anchor', 'middle');
					t.setAttribute('y', startY + wi * lineH + fs * 0.35);
					t.setAttribute('font-size', fs);
					t.setAttribute('font-weight', weight);
					t.setAttribute('fill', fill);
					t.setAttribute('font-family', 'inherit');
					// Text stroke for readability on light inactive states
					if (!data) {
						t.setAttribute('stroke', 'rgba(255,255,255,0.6)');
						t.setAttribute('stroke-width', '0.4');
						t.setAttribute('paint-order', 'stroke');
					}
					t.textContent = word;
					tg.appendChild(t);
				});
				gLabels.appendChild(tg);
			} catch(_) {}
		});

		if (loader) loader.style.display = 'none';
		wrapper.appendChild(svg);
	}

		_draw_geo_d3_map(_d3, mapId, geoUrl, nameKey, aliases, activeMap, type) {
		const wrapper = document.getElementById(mapId);
		const loader  = document.getElementById(mapId + '_l');
		const tipEl   = document.getElementById(mapId + '_tip');
		if (!wrapper) return;

		const _lightenHex = (hex, amt) => {
			try {
				const n = parseInt(hex.replace('#', ''), 16);
				const r = Math.min(255, Math.max(0, ((n >> 16) & 0xFF) + amt));
				const g = Math.min(255, Math.max(0, ((n >> 8)  & 0xFF) + amt));
				const b = Math.min(255, Math.max(0, ( n        & 0xFF) + amt));
				return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
			} catch(e) { return hex; }
		};

		const resolve = (raw) => {
			if (activeMap.has(raw)) return activeMap.get(raw);
			const a = aliases[raw];
			if (a && activeMap.has(a)) return activeMap.get(a);
			for (const [k, v] of activeMap)
				if (k.toLowerCase().includes(raw.toLowerCase()) || raw.toLowerCase().includes(k.toLowerCase()))
					return v;
			return null;
		};

		fetch(geoUrl)
			.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
			.then(geo => {
				// For district/block view: restrict to states with data for faster render
				let features = geo.features;
				if (type !== 'states') {
					const activeStates = new Set(
						(this._all_partners || []).flatMap(p => (p.budgets || []).map(b => b.state).filter(Boolean))
					);
					const statesWithAlias = new Set([...activeStates,
						...Object.entries(aliases).filter(([,v]) => activeStates.has(v)).map(([k]) => k)]);
					const filtered = features.filter(f => statesWithAlias.has(f.properties.NAME_1));
					if (filtered.length) features = filtered;
				}

				const W = wrapper.offsetWidth  || 460;
				const H = wrapper.offsetHeight || 280;
				const displayGeo = { type: 'FeatureCollection', features };
				const fullGeo    = type === 'states' ? geo : displayGeo;
				const proj       = _d3.geoMercator().fitSize([W - 8, H - 8], fullGeo);
				const pathFn     = _d3.geoPath().projection(proj);

				const NS  = 'http://www.w3.org/2000/svg';
				const svg = document.createElementNS(NS, 'svg');
				svg.setAttribute('width',  W);
				svg.setAttribute('height', H);
				svg.style.cssText = 'display:block;position:absolute;inset:0';

				const defs = document.createElementNS(NS, 'defs');
				defs.innerHTML =
					`<filter id="${mapId}_sh">
						<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#00000020"/>
					</filter>
					<style>@keyframes cbd-spin{to{transform:rotate(360deg)}}</style>`;
				svg.appendChild(defs);

				const g = document.createElementNS(NS, 'g');
				g.setAttribute('transform', 'translate(4,4)');
				svg.appendChild(g);

				// Render features
				const renderSet = type === 'states' ? geo.features : features;
				renderSet.forEach(feat => {
					const raw  = feat.properties[nameKey] || '';
					const meta = resolve(raw);
					const dStr = pathFn(feat);
					if (!dStr) return;

					const fill  = meta ? meta.color : (type === 'states' ? '#e2e8f0' : '#dbeafe');
					const hover = meta ? _lightenHex(meta.color, -30) : '#cbd5e1';

					const path = document.createElementNS(NS, 'path');
					path.setAttribute('d', dStr);
					path.setAttribute('fill', fill);
					path.setAttribute('stroke', '#ffffff');
					path.setAttribute('stroke-width', type === 'states' ? '0.8' : '0.5');
					path.setAttribute('filter', `url(#${mapId}_sh)`);
					path.style.transition = 'fill .12s';
					path.style.cursor = meta ? 'pointer' : 'default';

					// Tooltip
					const tipHtml = meta
						? (() => {
							const d0 = meta.items[0];
							if (type === 'states')
								return `<strong>${frappe.utils.escape_html(d0.state)}</strong>`;
							if (type === 'districts')
								return `<strong>${frappe.utils.escape_html(d0.district)}</strong>
								        <br><span style="opacity:.75;font-size:10px">${frappe.utils.escape_html(d0.state)}</span>`;
							// blocks
							const bnames = meta.items.map(b => frappe.utils.escape_html(b.block)).join(', ');
							return `<strong>${frappe.utils.escape_html(raw)}</strong><br>
							        <span style="font-size:10px;opacity:.8">${bnames}</span>`;
						  })()
						: frappe.utils.escape_html(raw);

					path.addEventListener('mouseenter', () => {
						path.setAttribute('fill', hover);
						if (tipEl) { tipEl.innerHTML = tipHtml; tipEl.style.display = 'block'; }
					});
					path.addEventListener('mousemove', ev => {
						if (!tipEl) return;
						const rc = wrapper.getBoundingClientRect();
						tipEl.style.left = Math.min(ev.clientX - rc.left + 12, rc.width  - 210) + 'px';
						tipEl.style.top  = Math.max(ev.clientY - rc.top  - 10, 4)               + 'px';
					});
					path.addEventListener('mouseleave', () => {
						path.setAttribute('fill', fill);
						if (tipEl) tipEl.style.display = 'none';
					});

					g.appendChild(path);

					// State/District name label on centroid (active only)
					if (meta) {
						try {
							const [cx, cy] = pathFn.centroid(feat);
							if (isNaN(cx) || isNaN(cy)) return;
							const t = document.createElementNS(NS, 'text');
							t.setAttribute('x', cx);
							t.setAttribute('y', cy + 3);
							t.setAttribute('text-anchor', 'middle');
							t.setAttribute('font-size', '8');
							t.setAttribute('font-weight', '700');
							t.setAttribute('fill', '#fff');
							t.setAttribute('pointer-events', 'none');
							t.setAttribute('paint-order', 'stroke');
							t.setAttribute('stroke', meta.color);
							t.setAttribute('stroke-width', '3');
							t.setAttribute('stroke-linejoin', 'round');
							const label = raw.split(' ').map(w => w[0]).join('').substring(0, 3);
							t.textContent = label;
							g.appendChild(t);
						} catch(_) {}
					}
				});

				if (loader) loader.style.display = 'none';
				wrapper.appendChild(svg);
			})
			.catch(err => {
				if (loader) loader.innerHTML =
					`<div style="text-align:center;padding:20px;color:#f87171;font-size:12px">
						<div style="font-weight:600">Map could not load</div>
						<div style="font-size:10px;opacity:.7;margin-top:4px">${frappe.utils.escape_html(err.message)}</div>
					</div>`;
			});
	}

		_ensure_d3() {
		if (typeof d3 !== 'undefined') return Promise.resolve(d3);
		return new Promise((resolve, reject) => {
			const CDNS = [
				'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js',
				'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
			];
			const tryNext = (i) => {
				if (i >= CDNS.length) { reject(new Error('D3 unavailable')); return; }
				if (document.querySelector(`script[src="${CDNS[i]}"]`)) {
					const wait = setInterval(() => { if (typeof d3 !== 'undefined') { clearInterval(wait); resolve(d3); } }, 50);
					setTimeout(() => { clearInterval(wait); tryNext(i+1); }, 3000);
					return;
				}
				const s = document.createElement('script');
				s.src = CDNS[i];
				s.onload  = () => resolve(window.d3 || d3);
				s.onerror = () => tryNext(i + 1);
				document.head.appendChild(s);
			};
			tryNext(0);
		});
	}

		/* ═══════════════════════════════════════════════════════════════════
	   ANALYTICS CHARTS — Modern visualizations for financial analysis
	   ═══════════════════════════════════════════════════════════════════ */
	_render_analytics_charts(s, partners) {
		const root = document.getElementById('cbd_analytics_section');
		if (!root) return;

		const _f   = v => parseFloat(v) || 0;
		const _cr  = v => this._fmtCr(v);
		const _pct = (a, b) => b ? Math.min(100, Math.max(0, (a / b) * 100)) : 0;

		const budget = _f(s.total_budget), disb = _f(s.total_disbursement);
		const util   = _f(s.total_utilisation), bank = _f(s.total_bank_balance);
		const disbPct = _pct(disb, budget), utilPct = _pct(util, budget);
		const utilOfDisb = _pct(util, disb);
		const bankOfDisb = _pct(bank, disb);

		// ── CHART 1: Budget Pipeline (horizontal stacked bars) ─────────────
		const _pipeBar = (label, value, pct, color, subtext) => `
			<div style="margin-bottom:14px">
				<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
					<span style="font-size:12px;font-weight:600;color:#374151">${label}</span>
					<span style="font-size:13px;font-weight:700;color:${color}">${_cr(value)}</span>
				</div>
				<div style="height:10px;background:#f3f4f6;border-radius:6px;overflow:hidden">
					<div style="height:100%;width:${Math.max(pct,0).toFixed(1)}%;background:${color};border-radius:6px;
					            transition:width 0.8s cubic-bezier(.4,0,.2,1)"></div>
				</div>
				<div style="font-size:10px;color:#9ca3af;margin-top:2px">${subtext}</div>
			</div>`;

		// ── CHART 2: Partner utilisation cards ─────────────────────────────
		const partnerBars = partners.map(p => {
			const pb = _f(p.total_budget), pu = _f(p.total_utilisation), pd = _f(p.total_disbursement);
			const pUp = _pct(pu, pb), pDp = _pct(pd, pb);
			const statusColor = pUp < 25 ? '#dc2626' : pUp < 60 ? '#d97706' : '#16a34a';
			const statusLabel = pUp < 25 ? 'Low' : pUp < 60 ? 'Moderate' : 'Good';
			return `
				<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;
				            box-shadow:0 1px 3px rgba(0,0,0,.06)">
					<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
						<div style="font-size:12px;font-weight:700;color:#111827;flex:1;min-width:0;
						            white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
						     title="${frappe.utils.escape_html(p.partner_name||'')}">
							${frappe.utils.escape_html(p.partner_name||'—')}
						</div>
						<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;
						             background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}30;
						             flex-shrink:0;margin-left:8px">${statusLabel}</span>
					</div>
					<!-- Utilisation bar -->
					<div style="font-size:10px;color:#6b7280;margin-bottom:3px;display:flex;justify-content:space-between">
						<span>Utilized</span><span style="color:${statusColor};font-weight:600">${pUp.toFixed(1)}%</span>
					</div>
					<div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;margin-bottom:8px">
						<div style="height:100%;width:${pUp.toFixed(1)}%;background:${statusColor};border-radius:4px;
						            transition:width 0.8s .1s cubic-bezier(.4,0,.2,1)"></div>
					</div>
					<!-- Disbursement bar -->
					<div style="font-size:10px;color:#6b7280;margin-bottom:3px;display:flex;justify-content:space-between">
						<span>Released</span><span style="color:#059669;font-weight:600">${pDp.toFixed(1)}%</span>
					</div>
					<div style="height:6px;background:#f3f4f6;border-radius:4px;overflow:hidden;margin-bottom:10px">
						<div style="height:100%;width:${pDp.toFixed(1)}%;background:#059669;border-radius:4px;
						            transition:width 0.8s .2s cubic-bezier(.4,0,.2,1)"></div>
					</div>
					<!-- Metrics row -->
					<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
						<div style="text-align:center;background:#f9fafb;border-radius:6px;padding:5px">
							<div style="font-size:11px;font-weight:700;color:#2563eb">${_cr(pb)}</div>
							<div style="font-size:9px;color:#9ca3af">Budget</div>
						</div>
						<div style="text-align:center;background:#f9fafb;border-radius:6px;padding:5px">
							<div style="font-size:11px;font-weight:700;color:#d97706">${_cr(pu)}</div>
							<div style="font-size:9px;color:#9ca3af">Utilized</div>
						</div>
						<div style="text-align:center;background:#f9fafb;border-radius:6px;padding:5px">
							<div style="font-size:11px;font-weight:700;color:#0891b2">${_cr(_f(p.total_bank_balance))}</div>
							<div style="font-size:9px;color:#9ca3af">Bank</div>
						</div>
					</div>
				</div>`;
		}).join('');

		// ── CHART 4: Fund Flow waterfall (visual flow) ────────────────────
		const flowSteps = [
			{ label:'Approved Budget', val: budget, color:'#2563eb', icon:'🏛' },
			{ label:'Released to Partners', val: disb,   color:'#059669', icon:'→' },
			{ label:'Funds Utilized',    val: util,   color:'#d97706', icon:'✓' },
			{ label:'Cash in Banks',     val: bank,   color:'#0891b2', icon:'🏦' },
		];
		const maxFlow = Math.max(...flowSteps.map(f => Math.abs(f.val)), 1);
		const flowBars = flowSteps.map((f, i) => {
			const w = (Math.abs(f.val) / maxFlow * 100).toFixed(1);
			const connector = i < flowSteps.length - 1 ?
				`<div style="display:flex;align-items:center;padding:2px 0 2px 20px">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2">
						<polyline points="6 9 12 15 18 9"/>
					</svg></div>` : '';
			return `
				<div style="display:flex;align-items:center;gap:10px;padding:5px 0">
					<div style="width:28px;height:28px;border-radius:50%;background:${f.color}18;
					            display:flex;align-items:center;justify-content:center;
					            font-size:13px;flex-shrink:0">${f.icon}</div>
					<div style="flex:1;min-width:0">
						<div style="font-size:11px;color:#6b7280;margin-bottom:3px">${f.label}</div>
						<div style="height:22px;background:#f9fafb;border-radius:4px;overflow:hidden;position:relative">
							<div style="position:absolute;inset:0 0 0 0;height:100%;width:${w}%;
							            background:${f.color};border-radius:4px;opacity:0.85;
							            transition:width 0.9s ${i*0.15}s cubic-bezier(.4,0,.2,1)"></div>
							<div style="position:absolute;inset:0;display:flex;align-items:center;
							            padding:0 8px;font-size:11px;font-weight:700;color:#fff;
							            mix-blend-mode:overlay">${_cr(f.val)}</div>
						</div>
					</div>
					<div style="width:52px;text-align:right;font-size:11px;font-weight:700;color:${f.color};flex-shrink:0">
						${i === 0 ? '100%' : _pct(f.val, budget).toFixed(1) + '%'}
					</div>
				</div>${connector}`;
		}).join('');

		// ── Assemble the analytics section HTML ───────────────────────────
		root.innerHTML = `
			<div class="cbd-section-header">
				<span class="cbd-section-title">ANALYTICS OVERVIEW</span>
			</div>
			<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding:16px">

				<!-- Chart 1: Fund Flow Pipeline -->
				<div class="cbd-chart-card">
					<div class="cbd-chart-card__title">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
						Fund Flow Pipeline
					</div>
					<div class="cbd-chart-card__sub">Budget → Released → Utilized → Bank</div>
					<div style="margin-top:8px">${flowBars}</div>
				</div>

				<!-- Chart 2: Utilisation Progress -->
				<div class="cbd-chart-card">
					<div class="cbd-chart-card__title">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
						Budget Utilisation Progress
					</div>
					<div class="cbd-chart-card__sub">How much of each allocation has been used</div>
					<div style="margin-top:12px">
						${_pipeBar('Funds Released to Partners', disb, disbPct, '#059669', `${disbPct.toFixed(1)}% of approved budget`)}
						${_pipeBar('Funds Utilized by Partners', util, utilPct, '#d97706', `${utilPct.toFixed(1)}% of approved budget`)}
						${_pipeBar('Utilized vs Released', util, utilOfDisb, '#7c3aed', `${utilOfDisb.toFixed(1)}% of released funds utilized`)}
						${_pipeBar('Cash in Partner Banks', bank, bankOfDisb, '#0891b2', `${bankOfDisb.toFixed(1)}% of released funds in bank`)}
					</div>
				</div>

				<!-- Chart 4: Partner Performance -->
				${partners.length > 0 ? `<div class="cbd-chart-card" style="grid-column:1/-1">
					<div class="cbd-chart-card__title">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
						Partner-wise Performance
					</div>
					<div class="cbd-chart-card__sub">Utilization &amp; disbursement progress per partner · Green = good (≥60%) · Amber = moderate · Red = low (&lt;25%)</div>
					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:12px">
						${partnerBars}
					</div>
				</div>` : ''}

			</div>`;
	}

		render_partners(partners) {
		this._all_partners = partners || [];
		this._render_overview_strip(partners || []);
	}

	// ─── Number formatting ──────────────────────────────────────────────

	// ═══════════════════════════════════════════════════════
	// TABLE UTILITIES: sort, paginate (15 rows/page), both
	// ═══════════════════════════════════════════════════════

	_enhance_table(tableId) {
		this._make_table_sortable(tableId);
		this._paginate_table(tableId);
	}

	// ── FIX (revised again) ──
	// Two sticky layers stack on top of each other here: the expand/count
	// bar (top:0) and, right below it, the column header row. Every <th>
	// in the header row MUST share the exact same top offset — if even
	// one cell gets a different value (this previously happened to the
	// "#" column, which ended up with an inline top:0 while its siblings
	// had top:31.99px), that one cell stops lining up with the rest of
	// the sticky header during horizontal scroll, since sticky-left and
	// sticky-top are combined on the "#"/"Expense Type" columns. The fix
	// is to compute the offset ONCE and assign it to every <th> in the
	// same pass (no per-cell branching), which is what the loop below
	// does.
	//
	// Main-head divider rows ("Annual Recurring operating cost" etc) are
	// sticky again too, pinned directly below the column header — see
	// CSS: .cbd-li-scrollbody .cbd-grp__header-row td. Their offset
	// (barH + theadH) is computed here from the same measurements so it
	// always matches the header's real height instead of a guessed
	// constant, and every group row gets that identical offset (the
	// standard "sticky section header" pattern: the active group's title
	// stays pinned, the next group's title pushes it out as you scroll
	// past — it does not overlap or hide other groups).
	_sync_li_header_offset(tableId) {
		const MIN_THEAD_H = 30; // sane floor — real header rows are always at least this tall
		let attempts = 0;
		const apply = () => {
			const table = document.getElementById(tableId);
			if (!table) return;
			const scopeEl = table.closest('.cbd-li-scrollbody') || table.parentElement;
			const bar = scopeEl ? scopeEl.querySelector('.cbd-li__expand-bar') : null;
			const thead = table.querySelector('thead');
			const headerRow = thead ? thead.querySelector('tr') : null;
			if (!bar || !thead || !headerRow) return;
			let theadH = headerRow.getBoundingClientRect().height || thead.offsetHeight || 0;
			// If the header row hasn't actually laid out yet (0 height),
			// retry a few times before falling back to a safe floor rather
			// than ever committing a broken value.
			if (theadH === 0 && attempts < 6) { attempts++; setTimeout(apply, 60); return; }
			if (theadH === 0) theadH = MIN_THEAD_H;

			// Every header cell gets the SAME offset, in one pass — this
			// is what keeps the sticky-left "#"/"Expense Type" columns
			// aligned with the rest of the header during horizontal
			// scroll (previously one cell could end up with a stale/
			// different inline top than its siblings).
			const headerTop = 0;
			headerRow.querySelectorAll('th').forEach(th => { th.style.top = headerTop + 'px'; });

			// Main-head divider ("main item") rows stick right below the
			// column header — same offset for every group row.
			const groupTop = Math.round(theadH);
			table.querySelectorAll('.cbd-grp__header-row td').forEach(td => { td.style.top = groupTop + 'px'; });
		};
		// A single requestAnimationFrame isn't always enough right after a
		// large innerHTML swap (many month columns can take more than one
		// frame to finish layout).
		requestAnimationFrame(() => requestAnimationFrame(apply));
		setTimeout(apply, 150);
	}

	// Two independent checkboxes: one collapses all month columns down to
	// just the Total column, the other collapses every group down to just
	// its main-head divider (hiding individual line items). Checked =
	// expanded (the default/current view), unchecked = collapsed.
	_wire_li_expand_checkboxes(tableId) {
		const table = document.getElementById(tableId);
		if (!table) return;
		const scopeEl = table.closest('.cbd-li-scrollbody') || table.parentElement;
		if (!scopeEl) return;
		const monthsChk = scopeEl.querySelector('.cbd-li__months-chk');
		const itemsChk  = scopeEl.querySelector('.cbd-li__items-chk');
		if (monthsChk) {
			monthsChk.addEventListener('change', () => {
				table.classList.toggle('cbd-li-months-collapsed', !monthsChk.checked);
				this._sync_li_header_offset(tableId);
			});
		}
		if (itemsChk) {
			itemsChk.addEventListener('change', () => {
				const expand = itemsChk.checked;
				table.classList.toggle('cbd-li-items-collapsed', !expand);
				// Force every row's display explicitly (not just clear to
				// empty and defer to the CSS class) — a prior per-group
				// click override otherwise could keep a specific group
				// stuck the way it was, ignoring the checkbox.
				table.querySelectorAll('.cbd-grp__child-row').forEach(r => {
					r.style.display = expand ? 'table-row' : 'none';
				});
				table.querySelectorAll('.cbd-grp__header-row').forEach(h => h.classList.remove('cbd-grp__header-row--collapsed'));
				this._sync_li_header_offset(tableId);
			});
		}
		this._wire_li_group_toggles(tableId);
	}

	// Clicking a main-head divider expands/collapses just that group's
	// line items — an accordion-style override on top of whatever the
	// global "Show line items" checkbox currently has set.
	_wire_li_group_toggles(tableId) {
		const table = document.getElementById(tableId);
		if (!table) return;
		table.querySelectorAll('.cbd-grp__header-row').forEach(header => {
			header.addEventListener('click', () => {
				const gid = header.dataset.grpTarget;
				if (!gid) return;
				const rows = table.querySelectorAll(`.cbd-grp__child-row[data-grp-parent="${gid}"]`);
				if (!rows.length) return;
				const currentlyVisible = window.getComputedStyle(rows[0]).display !== 'none';
				const nextDisplay = currentlyVisible ? 'none' : 'table-row';
				rows.forEach(r => { r.style.display = nextDisplay; });
				header.classList.toggle('cbd-grp__header-row--collapsed', currentlyVisible);
				this._sync_li_header_offset(tableId);
			});
		});
	}

	_make_table_sortable(tableId) {
		const table = document.getElementById(tableId);
		if (!table) return;
		if (table.dataset.sortWired === '1') return; // never double-wire click listeners
		table.dataset.sortWired = '1';
		const ths = [...table.querySelectorAll('thead th')];
		const ACTION_WIDTHS = new Set(['90px','110px','130px','200px','160px']);
		let sortCol = -1, sortAsc = true;

		ths.forEach((th, colIdx) => {
			if (ACTION_WIDTHS.has(th.style.width)) return;
			if (th.classList.contains('cbd-dt__th--num')) return; // skip # col
			th.style.cursor = 'pointer';
			th.style.userSelect = 'none';
			if (!th.querySelector('.cbd-sort-icon')) {
				const icon = document.createElement('span');
				icon.className = 'cbd-sort-icon';
				icon.textContent = ' ⇅';
				th.appendChild(icon);
			}
			th.addEventListener('click', () => {
				if (sortCol === colIdx) sortAsc = !sortAsc;
				else { sortCol = colIdx; sortAsc = true; }
				// Reset all icons
				ths.forEach(t => { const ic=t.querySelector('.cbd-sort-icon'); if(ic) ic.textContent=' ⇅'; });
				const ic = th.querySelector('.cbd-sort-icon');
				if (ic) ic.textContent = sortAsc ? ' ▲' : ' ▼';
				// Sort visible rows only (exclude group headers)
				const tbody = table.querySelector('tbody');
				if (!tbody) return;
				const dataRows = [...tbody.querySelectorAll('tr.cbd-dt__row')];
				dataRows.sort((a, b) => {
					const ac = a.querySelectorAll('td')[colIdx];
					const bc = b.querySelectorAll('td')[colIdx];
					if (!ac || !bc) return 0;
					const at = (ac.textContent||'').trim();
					const bt = (bc.textContent||'').trim();
					// Clean numeric sort (handles ₹, K, L, Cr, %)
					const _num = s => {
						const cleaned = s.replace(/[₹,%\s]/g,'');
						if (/Cr$/i.test(cleaned)) return parseFloat(cleaned)*10000000;
						if (/L$/i.test(cleaned))  return parseFloat(cleaned)*100000;
						if (/K$/i.test(cleaned))  return parseFloat(cleaned)*1000;
						return parseFloat(cleaned);
					};
					const an = _num(at), bn = _num(bt);
					if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an-bn : bn-an;
					return sortAsc ? at.localeCompare(bt) : bt.localeCompare(at);
				});
				dataRows.forEach(r => tbody.appendChild(r));
				// Re-apply pagination after sort
				const pagerCtx = table._pagerCtx;
				if (pagerCtx) { pagerCtx.currentPage = 1; pagerCtx.render(); }
			});
		});
	}

	_paginate_table(tableId, pageSize = 15) {
		const table = document.getElementById(tableId);
		if (!table) return;
		const tbody = table.querySelector('tbody');
		if (!tbody) return;

		// Remove old pager if re-applied
		const oldPager = document.getElementById(`cbd_pager_${tableId}`);
		if (oldPager) oldPager.remove();

		const allRows = () => [...tbody.querySelectorAll('tr.cbd-dt__row')];
		let currentPage = 1;

		const render = () => {
			const rows = allRows();
			const total = rows.length;
			if (total <= pageSize) {
				rows.forEach(r => r.style.display = '');
				return; // No pager needed
			}
			const totalPages = Math.ceil(total / pageSize);
			currentPage = Math.max(1, Math.min(currentPage, totalPages));
			const s = (currentPage-1)*pageSize, e = s+pageSize;
			rows.forEach((r, i) => {
				const visible = (i >= s && i < e);
				r.dataset.paginationHidden = visible ? '' : '1';
				// Only show if not search-hidden
				if (!visible) r.style.display = 'none';
				else if (r.getAttribute('data-search-hidden') !== '1') r.style.display = '';
			});
			// Update pager UI
			const pager = document.getElementById(`cbd_pager_${tableId}`);
			if (pager) {
				pager.querySelector('.cbd-pager__info').textContent =
					`Showing ${s+1}–${Math.min(e,total)} of ${total} records`;
				pager.querySelector('.cbd-pager__prev').disabled = currentPage <= 1;
				pager.querySelector('.cbd-pager__next').disabled = currentPage >= totalPages;
				pager.querySelector('.cbd-pager__page').textContent = `Page ${currentPage} of ${totalPages}`;
			}
		};

		if (allRows().length <= pageSize) { render(); return; }

		// Insert pager after the table
		const pager = document.createElement('div');
		pager.id = `cbd_pager_${tableId}`;
		pager.className = 'cbd-pager';
		pager.innerHTML = `
			<div class="cbd-pager__left">
				<button class="cbd-pager__btn cbd-pager__prev">‹ Prev</button>
				<span class="cbd-pager__page"></span>
				<button class="cbd-pager__btn cbd-pager__next">Next ›</button>
			</div>
			<span class="cbd-pager__info"></span>`;
		// Insert after table (within same tbl-wrap)
		const wrap = table.closest('.cbd-dm__tbl-wrap') || table.parentNode;
		wrap.appendChild(pager);

		pager.querySelector('.cbd-pager__prev').addEventListener('click', () => {
			if (currentPage > 1) { currentPage--; render(); }
		});
		pager.querySelector('.cbd-pager__next').addEventListener('click', () => {
			const rows = allRows();
			if (currentPage < Math.ceil(rows.length/pageSize)) { currentPage++; render(); }
		});

		// Store context for sort to call
		table._pagerCtx = { currentPage: 1, render };
		render();
	}

	_fmt(n) {
		if (n === null || n === undefined || n === '') return '—';
		const v = parseFloat(n) || 0;
		const abs = Math.abs(v);
		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
		return '₹' + Math.round(v).toLocaleString('en-IN');
	}

	_fmtFull(n) {
		if (n === null || n === undefined || n === '') return '—';
		const v = parseFloat(n) || 0;
		return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	_fmtCr(n) {
		if (n === null || n === undefined || n === '') return '—';
		const v   = parseFloat(n) || 0;
		const abs = Math.abs(v);
		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
		return '₹' + Math.round(v).toLocaleString('en-IN');
	}

	_fmtTip(n, label = 'Amount') {
		if (n === null || n === undefined || n === '') return '<span>—</span>';
		const v       = parseFloat(n) || 0;
		const short   = this._fmt(v);
		const full    = this._fmtFull(v);
		const tipText = label ? `${label}\n${full}` : full;
		const negStyle = v < 0 ? 'color:#dc2626;' : '';
		// data-raw stores the exact numeric value for export
		return `<span class="cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}"
			data-raw="${v}" style="cursor:default;border-bottom:1px dotted #94a3b8;${negStyle}">${short}</span>`;
	}

	_fmtCard(n, label = '') {
		if (n === null || n === undefined || n === '') return '<span class="cbd-scard__num-val">—</span>';
		const v       = parseFloat(n) || 0;
		const display = this._fmtCr(v);
		const full    = this._fmtFull(v);
		// Show negative indicator for over-utilized / excess bank states
		const negStyle = v < 0 ? 'color:#dc2626' : '';
		const tipText = label ? `${label}\n${full}` : full;
		return `<span class="cbd-scard__num-val cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}"
			style="cursor:default;${negStyle}">${display}</span>`;
	}

	_date(d){ if(!d)return'—'; return frappe.datetime.str_to_user(d)||d; }

	_metric(label,value,rawNum=null){
		const display = rawNum!==null ? this._fmtTip(rawNum, label) : value;
		return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${display}</span></div>`;
	}
	_metric_pct(label,pct){
		const v=parseFloat(pct)||0; const cls=v>=80?'green':v>=50?'amber':'red';
		return `<div class="cbd-metric cbd-metric--pct"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value cbd-metric__pct cbd-metric__pct--${cls}">${v.toFixed(1)}%</span></div>`;
	}
	_fill_cls(v){return v>=80?'green':v>=50?'amber':'red';}
	_chip_cls(v){return v>=80?'green':v>=50?'amber':'red';}
	_badge_cls(v){return v>=80?'green':v>=50?'amber':'red';}

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
	}

	_close_all_panels(){this._close_panels();this._close_disb_panel();}
	_close_panels(){
		const overlay=document.getElementById('cbd_overlay');
		const left=document.getElementById('cbd_panel_left');
		const right=document.getElementById('cbd_panel_right');
		if(overlay)overlay.classList.remove('cbd-overlay--active');
		if(left){left.classList.remove('cbd-panel--open','cbd-panel--full');}
		if(right){right.classList.remove('cbd-panel--open','cbd-panel--full');}
		document.body.classList.remove('cbd-panels-open');
	}
	_close_disb_panel(){
		const panel=document.getElementById('cbd_disb_modal');
		const overlay=document.getElementById('cbd_disb_overlay');
		if(panel)panel.classList.remove('cbd-disb-modal--open');
		if(overlay)overlay.classList.remove('cbd-disb-overlay--active');
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
		.cbd-filter-col { flex:1 1 0; min-width:160px; padding:8px 8px 0; box-sizing:border-box; }

		/* ── Section labels ── */
		.cbd-section-hd { display:flex; align-items:center; gap:10px; margin:0 0 10px; }
		.cbd-section-hd__line { flex:1; height:1px; background:#e8edf3; }
		.cbd-section-hd__label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#a0aec0; white-space:nowrap; flex-shrink:0; }

		/* ── Overview strip ── */
		.cbd-overview-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin-bottom:12px; }

		/* ── Summary cards — 4-col + 8 cards wrap ── */
		.cbd-summary-cards { display:grid; grid-template-columns:repeat(5,1fr); gap:5px; margin-bottom:6px; }

		/* ── Shared card base ── */
		.cbd-ostat, .cbd-scard {
			background:#fff; border:1px solid #e8edf3; border-left:4px solid #1e3a5f;
			border-radius:10px; min-width:0; word-break:break-word; transition:box-shadow .2s;
		}
		.cbd-scard { padding:8px 8px 7px; min-height:88px; display:flex; flex-direction:column; cursor:pointer; }
		.cbd-ostat { padding:11px 12px 10px; position:relative; display:flex; align-items:center; gap:10px; }
		.cbd-ostat--clickable { cursor:pointer; }
		.cbd-ostat:hover, .cbd-scard:hover { box-shadow:0 4px 18px rgba(0,0,0,.09); }
		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
		.cbd-ostat__arrow { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:var(--card-accent,#378ADD); opacity:0; transition:opacity .15s; }
		.cbd-ostat__icon { width:32px; height:32px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:7px; background:var(--ost-ibg,#EEF2FF); color:var(--card-accent,#378ADD); }
		.cbd-ostat__icon svg { width:16px; height:16px; }
		.cbd-ostat__body { min-width:0; flex:1; }
		.cbd-ostat__value { font-size:17px; font-weight:800; color:#1a202c; line-height:1.1; margin-bottom:1px; }
		.cbd-ostat__label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.55px; color:#8492a6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

		.cbd-scard__lbl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.55px; color:#8492a6; margin-bottom:5px; }
		.cbd-scard__num { font-size:18px; font-weight:800; color:#1a202c; line-height:1.1; margin-bottom:3px; letter-spacing:-.3px; }
		.cbd-scard__num-val { display:inline; }
		.cbd-scard__sub { font-size:12px; font-weight:500; color:#64748b; line-height:1.3; margin-bottom:5px; }
		.cbd-scard__pct-badge { display:inline-block; padding:2px 7px; border-radius:7px; font-size:12px; font-weight:800; margin-right:2px; }
		.cbd-scard__cta { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:700; letter-spacing:.3px; text-transform:uppercase; color:var(--card-accent,#378ADD); margin-top:auto; }

		/* ── Alert component ── */
		.cbd-alert { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; margin-bottom:14px; border-radius:8px; border:1px solid transparent; animation:cbd-slide-in .3s ease; }
		@keyframes cbd-slide-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
		.cbd-alert--warning { background:#fffbeb; border-color:#fde68a; border-left:4px solid #f59e0b; }
		.cbd-alert--warning .cbd-alert__icon { color:#d97706; }
		.cbd-alert--warning .cbd-alert__title { color:#92400e; }
		.cbd-alert--warning .cbd-alert__msg { color:#78350f; }
		.cbd-alert--danger { background:#fef2f2; border-color:#fecaca; border-left:4px solid #dc2626; }
		.cbd-alert--danger .cbd-alert__icon { color:#dc2626; }
		.cbd-alert--danger .cbd-alert__title { color:#7f1d1d; }
		.cbd-alert--danger .cbd-alert__msg { color:#991b1b; }
		.cbd-alert--success { background:#f0fdf4; border-color:#bbf7d0; border-left:4px solid #16a34a; }
		.cbd-alert--success .cbd-alert__icon { color:#16a34a; }
		.cbd-alert--success .cbd-alert__title { color:#14532d; }
		.cbd-alert--success .cbd-alert__msg { color:#166534; }
		.cbd-alert__icon { flex-shrink:0; margin-top:1px; }
		.cbd-alert__body { flex:1; min-width:0; }
		.cbd-alert__title { display:block; font-size:12px; font-weight:700; margin-bottom:2px; }
		.cbd-alert__msg { display:block; font-size:12px; }
		.cbd-alert__dismiss { flex-shrink:0; background:none; border:none; cursor:pointer; padding:2px; border-radius:4px; opacity:.7; }
		.cbd-alert__dismiss:hover { opacity:1; background:rgba(0,0,0,.06); }

		/* Frappe alerts must appear above our modals (z-index 3200) */
		/* Frappe alerts/toasts must appear ABOVE our modals (z-index 3200) */
		.frappe-alert, .frappe-alert-container,
		.alert-container, .alert-message,
		.toast-container, .frappe-toast-area,
		.frappe-toast, .notification-container,
		[class*="toast"], [class*="frappe-alert"] { z-index:99999 !important; }

		/* ── Chart card ── */
		.cbd-chart-card { background:#fff; border:1px solid #e8edf3; border-radius:12px; padding:18px 22px 18px; margin-bottom:16px; box-shadow:0 1px 3px rgba(15,23,42,.04); }
		.cbd-chart-card__legend { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
		.cbd-chart-legend__items { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
		.cbd-chart-legend__item { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:#334155; }
		.cbd-chart-legend__period { font-size:11px; font-weight:700; color:#1e3a5f; background:#eef4fd; border:1px solid #d3e3f8; border-radius:20px; padding:4px 12px; white-space:nowrap; }
		.cbd-chart-card__body { width:100%; }
		.cbd-donut__grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px; }
		.cbd-donut__panel { border:1px solid #eef2f7; border-radius:10px; padding:14px 16px; }
		.cbd-donut__panel-title { font-size:11.5px; font-weight:700; color:#475569; margin-bottom:10px; }
		.cbd-donut { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
		.cbd-donut__chart { position:relative; flex-shrink:0; width:140px; height:140px; }
		.cbd-donut__seg { transition:opacity .12s; }
		.cbd-donut__seg:hover { opacity:.82; }
		.cbd-donut__center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
		.cbd-donut__center-pct { font-size:21px; font-weight:800; color:#0f172a; line-height:1; }
		.cbd-donut__center-lbl { font-size:8.5px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.4px; margin-top:2px; }
		.cbd-donut__legend { flex:1; min-width:130px; display:flex; flex-direction:column; gap:6px; }
		.cbd-donut__row { cursor:pointer; display:flex; align-items:center; gap:8px; padding:5px 6px; border-radius:6px; transition:background .12s; }
		.cbd-donut__row:hover { background:#f8fafc; }
		.cbd-donut__dot { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
		.cbd-donut__row-lbl { font-size:11px; font-weight:600; color:#334155; flex:1; line-height:1.3; }
		.cbd-donut__row-val { font-size:11px; font-weight:700; color:#0f172a; white-space:nowrap; }
		.cbd-donut__empty { font-size:11px; color:#cbd5e1; font-style:italic; }
		.cbd-donut__overflow { margin-top:10px; font-size:10.5px; font-weight:600; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:5px 8px; }

		/* ── CHANGE #2: Wider ostat drill popup ── */
		.cbd-drill-modal-wrap { position:fixed; inset:0; z-index:3200; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; transition:background .2s ease; pointer-events:none; }
		.cbd-drill-modal-wrap--open { background:rgba(0,0,0,.45); pointer-events:all; }
		.cbd-drill-modal { background:var(--card-bg,#fff); border-radius:12px; border:1px solid var(--border-color,#d1d8dd); box-shadow:0 8px 40px rgba(0,0,0,.18); display:flex; flex-direction:column; max-height:80vh; width:100%; opacity:0; transform:scale(.96) translateY(8px); transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1); overflow:hidden; }
		.cbd-drill-modal-wrap--open .cbd-drill-modal { opacity:1; transform:scale(1) translateY(0); }
		/* CHANGE #2: --narrow is now 600px instead of 400px */
		.cbd-drill-modal--narrow { max-width:600px; }
		.cbd-drill-modal--wide   { max-width:760px; }
		.cbd-drill-modal--full   { max-width:min(960px,97vw); max-height:97vh; }
		.cbd-drill-modal--wide   { max-width:640px; }
		@media (max-width:640px) { .cbd-drill-modal-wrap { align-items:flex-end; padding:0; } .cbd-drill-modal { border-radius:16px 16px 0 0; max-width:100vw; max-height:85vh; transform:translateY(20px); } .cbd-drill-modal-wrap--open .cbd-drill-modal { transform:translateY(0); } }
		.cbd-drill-modal__header { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 14px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
		.cbd-drill-modal__searchbar { padding:10px 18px; background:#f8fafc; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
		.cbd-drill-modal__searchbar .cbd-dm__search-input { width:220px; }
		.cbd-drill-modal__header-left { display:flex; align-items:center; gap:12px; min-width:0; }
		.cbd-drill-modal__icon { width:38px; height:38px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#EEF5FC; color:#378ADD; }
		.cbd-drill-modal__title { font-size:15px; font-weight:700; color:var(--text-color,#1c2126); }
		.cbd-drill-modal__sub { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
		.cbd-drill-modal__close { width:30px; height:30px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; background:none; cursor:pointer; color:var(--text-muted,#8d99a6); transition:background .12s, color .12s; }
		.cbd-drill-modal__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
		.cbd-drill-modal__body { flex:1; overflow-y:auto; padding:0; }
		.cbd-drill-modal__body::-webkit-scrollbar { width:4px; }
		.cbd-drill-modal__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
		.cbd-drill-modal__footer { display:flex; justify-content:flex-end; align-items:center; padding:10px 18px; border-top:1px solid var(--border-color,#d1d8dd); flex-shrink:0; background:var(--control-bg,#f9f9f9); }

		/* ── Drill tables (dt2) ── */
		.cbd-dt2 { width:100%; border-collapse:collapse; font-size:13px; }
		.cbd-dt2 thead tr { background:var(--dt2-hdr,#4F46E5); }
		.cbd-dt2 .cbd-dt2__th-num,.cbd-dt2 .cbd-dt2__th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--dt2-hdr-text,#fff); border:1px solid rgba(255,255,255,.2); white-space:nowrap; }
		.cbd-dt2 .cbd-dt2__th--r { text-align:right; }
		.cbd-dt2 .cbd-dt2__th-num { width:42px; text-align:center; }
		.cbd-dt2 tbody tr:hover td { background:#f7f9fc; }
		.cbd-dt2 tbody tr:nth-child(even) td { background:#fafafa; }
		.cbd-dt2__num { text-align:center; font-size:11px; font-weight:700; border:1px solid var(--border-color,#d1d8dd); padding:8px 6px; }
		.cbd-dt2__cell { padding:9px 12px; font-size:13px; font-weight:500; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); }
		.cbd-dt2__badge-cell { padding:7px 12px; text-align:right; border:1px solid var(--border-color,#d1d8dd); }
		.cbd-dt2__pill { display:inline-flex; align-items:center; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:700; border:1px solid; }

		/* ── Accent modifiers ── */
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

		/* ── Budget modal ── */
		.cbd-bm__modal { overflow:hidden; max-width:720px; display:flex; flex-direction:column; }
		.cbd-bm__modal .cbd-bm__viewport { display:flex; width:200%; flex:1; transition:transform .28s cubic-bezier(.4,0,.2,1); }
		.cbd-bm__modal--detail .cbd-bm__viewport { transform:translateX(-50%); }
		.cbd-bm__page { width:50%; flex-shrink:0; display:flex; flex-direction:column; overflow:hidden; min-height:200px; }
		.cbd-bm__body { flex:1; overflow-y:auto; }
		.cbd-bm__topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; border-bottom:1px solid #e5e7eb; flex-shrink:0; background:#fff; }
		.cbd-bm__close { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color,#d1d8dd); border-radius:6px; background:none; cursor:pointer; color:var(--text-muted,#8d99a6); transition:background .12s, color .12s; }
		.cbd-bm__close:hover { background:#FCEBEB; color:#A32D2D; }

		/* ── Breadcrumb ── */
		.cbd-bc { display:flex; align-items:center; gap:4px; min-width:0; flex:1; }
		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
		.cbd-bc__item--root,.cbd-bc__item--active { font-weight:700; color:#111827; }
		.cbd-bc__item--link { background:none; border:none; padding:0; cursor:pointer; color:#4F46E5; font-weight:500; font-size:13px; transition:color .12s; white-space:nowrap; }
		.cbd-bc__item--link:hover { color:#3730A3; text-decoration:underline; }
		.cbd-bc__sep { color:#d1d5db; font-size:15px; line-height:1; flex-shrink:0; }

		/* ── Simple table (st) ── */
		.cbd-st { width:100%; border-collapse:collapse; font-size:13px; }
		.cbd-st th,.cbd-st td { border:1px solid #e5e7eb; padding:9px 12px; }
		.cbd-st__th { text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; background:#f9fafb; }
		.cbd-st__th--num { width:44px; text-align:center; }
		.cbd-st__th--r { text-align:right; }
		.cbd-st__num { text-align:center; color:var(--text-muted,#8d99a6); font-size:12px; background:var(--control-bg,#fafafa); }
		.cbd-st__cell { color:var(--text-color,#1c2126); }
		.cbd-st__r { text-align:right; font-weight:600; }
		.cbd-st__foot { background:#f9fafb; color:#374151; font-weight:600; font-size:13px; border-top:1px solid #e5e7eb !important; }
		.cbd-st tbody tr:hover td { background:#f9fafb; }
		.cbd-st__action { text-align:center; }
		.cbd-st__drill-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; font-size:11px; font-weight:600; color:#4F46E5; background:#EEF2FF; border:1px solid #c7d2fe; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .12s; }
		.cbd-st__drill-btn:hover { background:#e0e7ff; }

		/* ── sm modal wrap ── */
		.cbd-sm-wrap { position:fixed; inset:0; z-index:3100; background:rgba(0,0,0,0); display:flex; align-items:flex-start; justify-content:center; padding:0; box-sizing:border-box; overflow-y:auto; transition:background .2s ease; pointer-events:none; }
		.cbd-sm-wrap--open { background:rgba(0,0,0,.4); pointer-events:all; }
		.cbd-sm-modal { background:#fff; width:auto; min-width:440px; max-width:min(95vw,820px); margin:40px auto; border-radius:10px; border:1px solid #e5e7eb; box-shadow:0 8px 32px rgba(0,0,0,.12); display:flex; flex-direction:column; max-height:calc(100vh - 80px); opacity:0; transform:translateY(12px); transition:opacity .2s ease, transform .2s ease; overflow:hidden; }
		.cbd-sm-wrap--open .cbd-sm-modal { opacity:1; transform:translateY(0); }

		/* ── Universal Drill Modal (dw) ── */
		.cbd-dw { position:fixed; inset:0; z-index:3200; background:rgba(0,0,0,0); display:flex; align-items:flex-start; justify-content:center; padding:0; overflow-y:auto; box-sizing:border-box; transition:background .2s ease; pointer-events:none; }
		.cbd-dw--open { background:rgba(0,0,0,.45); pointer-events:all; }
		.cbd-dm { background:#fff; width:min(99vw, 1380px); margin:14px auto; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 24px 64px rgba(0,0,0,.20); display:flex; flex-direction:column; min-height:200px; max-height:calc(100vh - 28px); overflow:hidden; opacity:0; transform:translateY(14px); transition:opacity .2s ease, transform .2s ease; }
		.cbd-dw--open .cbd-dm { opacity:1; transform:translateY(0); }
		.cbd-dm__track { display:flex; width:300%; flex:1; transition:transform .28s cubic-bezier(.4,0,.2,1); min-height:0; }
		.cbd-dm__page { width:calc(100%/3); flex-shrink:0; display:flex; flex-direction:column; overflow:hidden; min-height:0; }
		.cbd-dm__track--2 { width:200%; }
		.cbd-dm__page--2 { width:50%; }
		.cbd-dm__topbar { display:flex; align-items:center; justify-content:space-between; padding:11px 18px; border-bottom:2px solid #e8edf3; flex-shrink:0; gap:12px; background:linear-gradient(to right,#f8fafc,#fff); }
		.cbd-dm__topbar-left { display:flex; align-items:center; gap:8px; min-width:0; flex:1; }
		.cbd-dm__back { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; font-size:12px; font-weight:600; color:#374151; background:#fff; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; white-space:nowrap; flex-shrink:0; transition:background .12s; }
		.cbd-dm__back:hover { background:#f3f4f6; }
		.cbd-dm__actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
		.cbd-dm__body { flex:1; overflow:hidden; min-height:0; display:flex; flex-direction:column; }
		.cbd-dm__tbl-wrap { flex:1; overflow:auto; min-height:0; padding:10px 14px; }
		/* Line items page (p3): make body the scroll container for reliable sticky */
		.cbd-li-scrollbody { overflow:auto !important; display:block !important; flex:1; min-height:0; }
		.cbd-li-scrollbody .cbd-dm__tbl-wrap { overflow:visible; flex:none; padding:0; }
		/* Not sticky — the header row itself now sits at top:0, so the
		   bar can't also stick there without the two overlapping. */
		.cbd-li-scrollbody .cbd-li__expand-bar { position:static; height:32px; box-sizing:border-box; }
		.cbd-li-scrollbody .cbd-dt thead th { position:sticky; top:0; z-index:9; background:#dbeafe; }
		.cbd-li-scrollbody .cbd-dt tfoot { position:static; z-index:auto; }
		/* ── FIX ──
		   Grouped line-item tables previously had TWO independent sticky
		   layers stacked on each other: the <thead> element itself
		   (position:sticky; top:0; z-index:3 — from the base .cbd-dt rule
		   further down) AND its <th> cells individually (top:32px;
		   z-index:9 — above). Sticky positioning on a <thead> as a whole
		   is not part of any table-layout spec and behaves inconsistently
		   across browsers (each browser decides differently what box the
		   sticky offset applies to), which caused two different bugs
		   depending on the thead's z-index:
		     - z-index:3 (original): the thead's own box painted OVER the
		       first group-divider row sitting right beneath it, making
		       that row appear to vanish.
		     - z-index:-1 (an attempted fix): the thead's box — and
		       everything rendered inside it, including the header text —
		       got pushed BEHIND the table body instead, so the header
		       row appeared blank/empty even though its <th> cells still
		       contained "Expense Type", "Sub Head", etc.
		   The correct, standards-safe pattern is to make ONLY the <th>
		   cells sticky and leave the <thead> itself in normal flow —
		   sticky positioning resolves against the nearest scrolling
		   ancestor (.cbd-li-scrollbody here), not the nearest positioned
		   ancestor, so the <thead> does not need to be sticky itself for
		   its <th> children to stick correctly. Each <th> now also carries
		   its own background so it still fully covers whatever scrolls
		   beneath it. This is scoped to .cbd-li-scrollbody only, so the
		   sticky header behavior of every other (non-grouped) .cbd-dt
		   table elsewhere in the dashboard is unaffected. */
		.cbd-li-scrollbody .cbd-dt thead { position:static; z-index:auto; background:none; }
		/* Sticky '#' and 'Expense Type' columns for the month-wise line-item
		   tables (they can have many month columns needing horizontal
		   scroll, and many rows needing vertical scroll — this keeps you
		   oriented on both axes). */
		.cbd-dt--grouped .cbd-li__sticky-num,
		.cbd-dt--grouped .cbd-li__sticky-exp { position:sticky; z-index:4; }
		.cbd-dt--grouped .cbd-li__sticky-num { left:0; }
		.cbd-dt--grouped .cbd-li__sticky-exp { left:44px; }
		.cbd-dt--grouped thead .cbd-li__sticky-num,
		.cbd-dt--grouped thead .cbd-li__sticky-exp { z-index:11; }
		.cbd-dm__tbl-wrap::-webkit-scrollbar { width:5px; height:5px; }
		.cbd-dm__tbl-wrap::-webkit-scrollbar-thumb { background:#94a3b8; border-radius:3px; }
		.cbd-dm__loading { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }
		.cbd-dm__empty { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }
		.cbd-dm__close { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; flex-shrink:0; border:1px solid #e2e8f0; border-radius:7px; background:#fff; cursor:pointer; color:#64748b; transition:background .12s, color .12s; }
		.cbd-dm__close:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }
		.cbd-dm__search { display:flex; align-items:center; gap:6px; padding:0 10px; height:30px; border:1px solid #e2e8f0; border-radius:7px; background:#f8fafc; color:#94a3b8; transition:border-color .12s; }
		.cbd-dm__search:focus-within { border-color:#93c5fd; background:#fff; }
		.cbd-dm__search-input { border:none; background:none; outline:none; font-size:12px; color:#1e293b; width:130px; }
		.cbd-dm__search-input::placeholder { color:#94a3b8; }

		/* ── Export dropdown ── */
		.cbd-exp-dd { position:relative; flex-shrink:0; }
		.cbd-exp-btn--main { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; font-size:12px; font-weight:600; color:#1e3a5f; background:#e8f0fe; border:1px solid #93c5fd; border-radius:7px; cursor:pointer; transition:background .12s; }
		.cbd-exp-btn--main:hover { background:#dbeafe; }
		.cbd-exp-dd__menu { position:absolute; top:calc(100% + 4px); right:0; min-width:160px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.12); opacity:0; visibility:hidden; transform:translateY(-4px); transition:opacity .12s, transform .12s, visibility .12s; z-index:20; overflow:hidden; padding:4px; }
		.cbd-exp-dd--open .cbd-exp-dd__menu { opacity:1; visibility:visible; transform:translateY(0); }
		.cbd-exp-dd__item { display:flex; align-items:center; gap:8px; width:100%; padding:8px 10px; font-size:12px; font-weight:500; text-align:left; color:#334155; background:none; border:none; border-radius:6px; cursor:pointer; transition:background .1s; }
		.cbd-exp-dd__item:hover { background:#f1f5f9; }

		/* ── Drill-down table (dt) ── */
		.cbd-dt { width:100%; border-collapse:collapse; font-size:13px; white-space:nowrap; border:1px solid #cbd5e1; }
		.cbd-dt thead { position:sticky; top:0; z-index:3; background:#dbeafe; }
		.cbd-dt tfoot { position:static; background:#bfdbfe; }
		/* Ensure sticky works inside tbl-wrap scroll container */
		.cbd-dm__tbl-wrap { position:relative; }
		.cbd-dt th { padding:10px 14px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#1e3a5f; background:#dbeafe; border:1px solid #93c5fd; }
		.cbd-dt td { padding:9px 14px; border:1px solid #e2e8f0; vertical-align:middle; color:#334155; background:#fff; }
		.cbd-dt__th--num { width:44px; text-align:center; }
		.cbd-dt__th--r { text-align:right; }
		.cbd-dt__row:hover td { background:#eff6ff !important; transition:background .08s; }
		.cbd-dt__num { text-align:center; color:#64748b; font-size:11px; width:44px; font-weight:600; background:#f8fafc; }
		.cbd-dt__name { color:#0f172a; font-weight:500; }
		.cbd-dt__r { text-align:right; font-weight:700; color:#0f172a; }
		.cbd-dt__pct { font-weight:800; }
		.cbd-dt__act { text-align:center; }
		/* CHANGE #9: indented child row number and cell */
		.cbd-dt__indent-num { padding-left:22px !important; }
		.cbd-dt__cell-indent { padding-left:22px !important; }
		.cbd-dt tfoot tr td,.cbd-dt__foot { padding:10px 14px; font-weight:800; font-size:13px; color:#1e3a5f; background:#bfdbfe !important; border:1px solid #93c5fd !important; }
		.cbd-dt__btn { display:inline-flex; align-items:center; gap:4px; padding:4px 12px; font-size:11px; font-weight:600; color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd; border-radius:6px; cursor:pointer; transition:all .12s; }
		.cbd-dt__btn:hover { background:#dbeafe; }
		.cbd-dt__btn:disabled { opacity:.4; cursor:not-allowed; }
		.cbd-dm__consolidated-btn { display:flex; width:fit-content; font-weight:700; }

		/* ── Line item section dividers ── */
		.cbd-dt--grouped { table-layout:auto; }
		.cbd-grp__header-row { background:#f1f5f9 !important; cursor:pointer; }
		.cbd-grp__header-row:hover { background:#e2e8f0 !important; }
		.cbd-grp__header-row:hover td { background:#e2e8f0 !important; }
		.cbd-grp__header-row td { background:#f1f5f9 !important; border:1px solid #dbe3ea !important; padding:8px 14px !important; transition:background .12s; }
		/* ── FIX ──
		   Main-head divider rows ("Annual Recurring operating cost" etc)
		   are sticky again — they were temporarily disabled while tracking
		   down an overlap bug, but that bug's real cause was the <thead>
		   ELEMENT ITSELF being sticky at the same time as its <th> cells
		   (fixed above: the <thead> is now position:static). With that
		   root cause gone, a shared sticky offset across every group row
		   behaves like the standard "sticky section header" pattern: the
		   current group's title stays pinned just below the column
		   header, and the next group's title pushes it out as you scroll
		   past — it does not hide/overlap other groups. The actual top
		   offset (bar height + header height) is written in as an inline
		   style by _sync_li_header_offset() so it always matches the
		   real, current header height instead of a guessed constant. */
		.cbd-li-scrollbody .cbd-grp__header-row td { position:sticky; z-index:6; }
		.cbd-grp__header { display:flex; align-items:center; gap:10px; }
		.cbd-grp__chevron { flex-shrink:0; color:#64748b; transition:transform .15s ease; }
		.cbd-grp__header-row--collapsed .cbd-grp__chevron { transform:rotate(-90deg); }
		.cbd-grp__title { font-weight:700; color:#1e293b; font-size:12.5px; }
		.cbd-grp__count { font-size:10.5px; font-weight:600; color:#94a3b8; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:1px 8px; }
		.cbd-grp__subtotal { margin-left:auto; font-weight:800; color:#0f172a; font-size:12.5px; }
		/* Collapse toggles: hide month columns and/or individual line items */
		.cbd-dt--grouped.cbd-li-months-collapsed .cbd-li__month-col { display:none; }
		.cbd-dt--grouped.cbd-li-items-collapsed .cbd-grp__child-row { display:none; }

		/* ── Pending utilization date bar ── */
		.cbd-pu__datebar { padding:12px 18px 8px; border-bottom:1px solid #eef2f7; background:#f8fafc; }
		.cbd-pu__datebar-inner { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
		.cbd-pu__datelbl { font-size:11px; font-weight:700; color:#475569; white-space:nowrap; }
		.cbd-pu__datelbl-hint { font-weight:400; color:#94a3b8; font-style:italic; }
		.cbd-pu__date-ctrl-wrap { min-width:180px; max-width:220px; }
		.cbd-pu__date-ctrl-wrap .frappe-control { margin-bottom:0 !important; }
		.cbd-pu__date-ctrl-wrap .control-label { display:none !important; }
		.cbd-pu__dateinfo { font-size:11px; color:#64748b; padding-top:4px; font-style:italic; }
		.cbd-pu__month-chip { display:inline-block; font-size:10px; font-weight:600; color:#9a3412; background:#ffedd5; border:1px solid #fed7aa; border-radius:12px; padding:2px 8px; margin:1px 3px 1px 0; white-space:nowrap; }
		.cbd-pu__months-cell { max-height:64px; overflow-y:auto; overflow-x:hidden; white-space:normal; padding:2px 2px 2px 0; }
		.cbd-pu__months-cell::-webkit-scrollbar { width:4px; }
		.cbd-pu__months-cell::-webkit-scrollbar-thumb { background:#fca5a5; border-radius:2px; }
		.cbd-pu__month-chip--more { color:#475569; background:#f1f5f9; border-color:#e2e8f0; }
		.cbd-pu__no-email { color:#cbd5e1; font-style:italic; font-size:12px; }
		.cbd-pu__msgbar { padding:10px 18px; border-bottom:1px solid #eef2f7; background:#f8fafc; }
		.cbd-pu__msglbl { display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:5px; }
		.cbd-pu__msglbl-opt { font-weight:500; color:#94a3b8; text-transform:none; letter-spacing:0; }
		.cbd-pu__msgbox { width:100%; resize:vertical; min-height:42px; font-size:12.5px; font-family:inherit; color:#1e293b; border:1px solid #e2e8f0; border-radius:7px; padding:8px 10px; background:#fff; transition:border-color .12s; }
		.cbd-pu__msgbox:focus { outline:none; border-color:#93c5fd; }

		/* ── Tooltip ── */
		.cbd-tip-wrap { border-bottom:1px dashed #94a3b8; cursor:default; }
		#cbd-global-tip { position:fixed; z-index:9999; pointer-events:none; background:#1A1D23; border:1px solid rgba(255,255,255,.10); color:#fff; border-radius:10px; font-family:inherit; box-shadow:0 12px 32px rgba(0,0,0,.30); opacity:0; transform:translateY(8px) scale(.96); transition:opacity .16s ease, transform .2s cubic-bezier(.22,1,.36,1); min-width:150px; max-width:260px; overflow:hidden; padding:0; }
		#cbd-global-tip .cbd-tip__header { padding:7px 12px 5px; border-bottom:1px solid rgba(255,255,255,.08); display:flex; align-items:center; gap:6px; }
		#cbd-global-tip .cbd-tip__icon { width:16px; height:16px; border-radius:4px; background:rgba(55,138,221,.25); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
		#cbd-global-tip .cbd-tip__label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.7px; color:rgba(255,255,255,.50); }
		#cbd-global-tip .cbd-tip__body { padding:6px 12px 10px; }
		#cbd-global-tip .cbd-tip__amount { font-size:16px; font-weight:700; letter-spacing:.3px; color:#fff; display:block; }
		#cbd-global-tip .cbd-tip__hint { font-size:10px; color:rgba(255,255,255,.35); margin-top:2px; display:block; }
		#cbd-global-tip::after { content:''; position:absolute; left:50%; transform:translateX(-50%); bottom:-6px; border:6px solid transparent; border-bottom:none; border-top-color:#1A1D23; }
		#cbd-global-tip.cbd-tip--visible { opacity:1; transform:translateY(0) scale(1); }
		#cbd-global-tip.cbd-tip--below::after { bottom:auto; top:-6px; border-top:none; border-bottom:6px solid #1A1D23; }

		/* ── Responsive ── */
		
				/* ── Analytics Charts ─────────────────────────────────────────── */
		.cbd-analytics-section { border-top:1px solid var(--border-color,#e5e7eb); }
		.cbd-chart-card {
			background:#fff; border:1px solid #e5e7eb; border-radius:14px;
			padding:16px; box-shadow:0 1px 4px rgba(0,0,0,.05);
		}
		.cbd-chart-card__title {
			display:flex; align-items:center; gap:6px;
			font-size:13px; font-weight:700; color:#111827;
		}
		.cbd-chart-card__sub {
			font-size:11px; color:#9ca3af; margin-top:2px;
		}

				/* ── Geo Map: panel sizing for districts/blocks ── */
		.cbd-stat-panel.cbd-geo-wide { max-width:580px; width:92vw; max-height:88vh; }
		@keyframes cbd-spin { to { transform:rotate(360deg); } }

				/* ── Line item count bar ── */
		.cbd-li__expand-bar {
			display:flex; align-items:center; justify-content:space-between;
			padding:8px 16px; background:#f0f9ff; border-bottom:1px solid #bae6fd;
			gap:12px; flex-shrink:0; flex-wrap:wrap;
		}
		.cbd-li__expand-hint { font-size:11px; color:#94a3b8; margin-right:auto; }
		.cbd-li__toggle { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:#1e3a5f; cursor:pointer; user-select:none; white-space:nowrap; }
		.cbd-li__toggle input { width:14px; height:14px; accent-color:#0369a1; cursor:pointer; }

		/* ── Pagination ── */
		.cbd-pager { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; background:#f8fafc; border-top:1px solid #e2e8f0; flex-shrink:0; gap:10px; }
		.cbd-pager__left { display:flex; align-items:center; gap:8px; }
		.cbd-pager__btn { display:inline-flex; align-items:center; padding:4px 12px; font-size:12px; font-weight:600; color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd; border-radius:6px; cursor:pointer; transition:background .12s; }
		.cbd-pager__btn:hover:not(:disabled) { background:#dbeafe; }
		.cbd-pager__btn:disabled { opacity:.4; cursor:not-allowed; }
		.cbd-pager__page { font-size:11px; font-weight:600; color:#475569; }
		.cbd-pager__info { font-size:11px; color:#6b7280; }

		/* ── Sort icon ── */
		.cbd-sort-icon { font-size:10px; color:#94a3b8; vertical-align:middle; }
		thead th:hover .cbd-sort-icon { color:#2563eb; }

		/* ── Pending util filter bar ── */
		.cbd-pu__filterbar {
			display:flex; align-items:center; justify-content:space-between;
			padding:10px 18px; background:#f0f7ff; border-bottom:1px solid #dbeafe;
			gap:12px; flex-shrink:0; flex-wrap:wrap;
		}
		.cbd-pu__filterbar-left { display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; min-width:0; }
		.cbd-pu__ctrl-wrap { min-width:130px; }
		.cbd-pu__ctrl-wrap .control-label { display:none !important; }
		.cbd-pu__ctrl-wrap .frappe-control { margin-bottom:0 !important; }

		/* ── Table horizontal scroll fix ── */
		.cbd-dm__tbl-wrap { overflow:auto !important; }
		.cbd-dm__tbl-wrap table { min-width:max-content; }

		/* ── Action column buttons: side by side ── */
		.cbd-dt__act-stack { display:flex; flex-direction:column; gap:3px; min-width:90px; max-width:130px; }

		@media (max-width:1200px) { .cbd-summary-cards { grid-template-columns:repeat(4,1fr); } }
		@media (max-width:1024px) { .cbd-summary-cards { grid-template-columns:repeat(4,1fr); } .cbd-overview-strip { grid-template-columns:repeat(4,1fr); } }
		@media (max-width:768px) { .cbd-root { padding:8px 10px 30px; } .cbd-filter-col { flex:1 1 50%; min-width:130px; } .cbd-summary-cards { grid-template-columns:repeat(2,1fr); } .cbd-overview-strip { grid-template-columns:repeat(2,1fr); }
			.cbd-dm__topbar { flex-wrap:wrap; row-gap:8px; }
			.cbd-dm__topbar-left { flex-basis:100%; }
			.cbd-dm__actions { flex-basis:100%; justify-content:flex-end; flex-wrap:wrap; }
			.cbd-dm__search-input { width:110px; }
			.cbd-drill-modal__searchbar .cbd-dm__search-input { width:100%; }
			.cbd-pu__filterbar { flex-wrap:wrap; }
			.cbd-pu__filterbar-left { flex-basis:100%; }
		}
		@media (max-width:640px) {
			.cbd-dm { width:100vw; margin:0; border-radius:0; max-height:100vh; }
			.cbd-dw { padding:0; }
		}
		@media (max-width:480px) {
			.cbd-summary-cards { grid-template-columns:repeat(2,1fr); } .cbd-overview-strip { grid-template-columns:1fr 1fr; } .cbd-scard { padding:10px 10px; } .cbd-scard__num { font-size:16px; }
			.cbd-filter-col { flex:1 1 100%; min-width:0; }
			.cbd-dm__search-input { width:90px; }
			.cbd-drill-modal__header { flex-wrap:wrap; row-gap:6px; }
		}
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
				const isPlain = el.classList.contains('cbd-tip-wrap--plain');
				const short = isPlain ? '' : el.textContent.trim();
				const icon_svg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(55,138,221,.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
				tip.innerHTML =
					'<div class="cbd-tip__header">' +
						'<span class="cbd-tip__icon">' + icon_svg + '</span>' +
						'<span class="cbd-tip__label">' + frappe.utils.escape_html(lbl) + '</span>' +
					'</div>' +
					'<div class="cbd-tip__body">' +
						'<span class="cbd-tip__amount">' + frappe.utils.escape_html(text) + '</span>' +
						(short ? '<span class="cbd-tip__hint">Abbreviated as ' + frappe.utils.escape_html(short) + '</span>' : '') +
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
				const top = above ? r.top + window.scrollY - th - 10 : r.bottom + window.scrollY + 8;
				tip.style.left = left + 'px';
				tip.style.top  = top  + 'px';
				tip.classList.add('cbd-tip--visible');
			};
			const _hide = () => { _hide_timer = setTimeout(() => tip.classList.remove('cbd-tip--visible'), 120); };
			document.addEventListener('mouseover', (e) => { const el = e.target.closest('.cbd-tip-wrap'); if (el && el.dataset.tip) _show(el); });
			document.addEventListener('mouseout',  (e) => { const el = e.target.closest('.cbd-tip-wrap'); if (el) _hide(); });
			document.addEventListener('scroll', () => tip.classList.remove('cbd-tip--visible'), true);
		}
	}
}
// frappe.pages['creche-finance-dashboard'].on_page_load = function (wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Finance Dashboard',
// 		single_column: true,
// 	});
// 	new FinanceDashboard(page, wrapper);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // FinanceDashboard
// // ─────────────────────────────────────────────────────────────────────────────
// class FinanceDashboard {
// 	constructor(page, wrapper) {
// 		this.page = page;
// 		this.$root = $(wrapper).find('.page-content');

// 		this.filter_options  = {};
// 		this.controls        = {};          // Frappe control instances keyed by filter key
// 		this.partner_name_to_id = {};       // partner display-name → partner_id map

// 		// Drill-down state
// 		this.level = 0;
// 		this.ctx = { partner_id: null, partner_name: null, budget_id: null, budget_name: null };
// 		this.active_card = null;
// 		this.sort_col = null;
// 		this.sort_dir = 'desc';

// 		this.init();
// 	}

// 	// ── Bootstrap ───────────────────────────────────────────────────────────

// 	async init() {
// 		this.$root.html(this._styles() + `
// 			<div id="fd-wrap" class="fd-wrap">
// 				<div class="fd-filter-bar" id="fd-filter-bar"></div>
// 				<div class="fd-cards-grid" id="fd-cards"></div>
// 				<div class="fd-table-section" id="fd-table-section">
// 					<div class="fd-table-header">
// 						<div class="fd-breadcrumb" id="fd-breadcrumb"></div>
// 						<div id="fd-table-actions"></div>
// 					</div>
// 					<div id="fd-table-wrap"></div>
// 				</div>
// 			</div>
// 		`);

// 		this.$el    = this.$root.find('#fd-wrap');
// 		this.$cards = this.$root.find('#fd-cards');
// 		this.$table = this.$root.find('#fd-table-wrap');
// 		this.$crumb = this.$root.find('#fd-breadcrumb');
// 		this.$bar   = this.$root.find('#fd-filter-bar');

// 		await this._load_filter_options();
// 		this._render_filter_bar();
// 		await this.refresh();
// 	}

// 	// ── Filter options (initial load or cascade) ────────────────────────────

// 	async _load_filter_options(cascade = false) {
// 		const args = cascade ? this._filters_for_cascade() : {};
// 		const r = await frappe.call({
// 			method: 'creche_reports.api.dashboard.get_dashboard_filters',
// 			args,
// 		});
// 		this.filter_options = r.message || {};
// 		// Rebuild partner name→id map
// 		this.partner_name_to_id = {};
// 		(this.filter_options.partners || []).forEach(p => {
// 			this.partner_name_to_id[p.name] = p.id;
// 		});
// 	}

// 	// ── Filter bar (Frappe MultiSelect controls) ─────────────────────────────

// 	_render_filter_bar() {
// 		const fo  = this.filter_options;
// 		const bar = this.$bar;
// 		bar.empty();
// 		this.controls = {};

// 		const filter_defs = [
// 			{ key: 'year',     label: 'Year',     opts: fo.financial_years || [] },
// 			{ key: 'partner',  label: 'Partner',  opts: (fo.partners || []).map(p => p.name) },
// 			{ key: 'grant',    label: 'Grant',    opts: fo.grants || [] },
// 			{ key: 'state',    label: 'State',    opts: fo.states || [] },
// 			{ key: 'district', label: 'District', opts: fo.districts || [] },
// 			{ key: 'block',    label: 'Block',    opts: fo.blocks || [] },
// 			{ key: 'month',    label: 'Month',    opts: fo.months || [] },
// 			{ key: 'quarter',  label: 'Quarter',  opts: fo.quarters || [] },
// 		];

// 		const $grid = $('<div class="fd-filter-grid"></div>');
// 		bar.append($grid);

// 		filter_defs.forEach(fd => {
// 			const $wrap = $(`<div class="fd-filter-field"></div>`);
// 			$grid.append($wrap);

// 			const ctrl = frappe.ui.form.make_control({
// 				parent: $wrap[0],
// 				df: {
// 					fieldtype:  'MultiSelect',
// 					fieldname:  fd.key,
// 					label:      fd.label,
// 					options:    fd.opts.join('\n'),
// 					onchange:   () => this._schedule_cascade(),
// 				},
// 				render_input: true,
// 			});
// 			ctrl.refresh();
// 			this.controls[fd.key] = ctrl;
// 		});

// 		const $btns = $(`
// 			<div class="fd-bar-btns">
// 				<button class="fd-btn fd-btn-primary" id="fd-apply-btn">Apply</button>
// 				<button class="fd-btn fd-btn-ghost"   id="fd-clear-btn">Clear All</button>
// 			</div>
// 		`);
// 		bar.append($btns);

// 		$btns.find('#fd-apply-btn').on('click', () => this.refresh());
// 		$btns.find('#fd-clear-btn').on('click', async () => {
// 			Object.values(this.controls).forEach(c => c.set_value(''));
// 			await this._load_filter_options(false);
// 			this._render_filter_bar();
// 			this.refresh();
// 		});
// 	}

// 	// ── Cascade: reload options, trim stale selections ───────────────────────

// 	_schedule_cascade() {
// 		clearTimeout(this._cascade_timer);
// 		this._cascade_timer = setTimeout(() => this._cascade_filters(), 500);
// 	}

// 	async _cascade_filters() {
// 		if (!this.controls || !Object.keys(this.controls).length) return;

// 		// Save current values before reload
// 		const saved = {};
// 		Object.keys(this.controls).forEach(k => {
// 			saved[k] = this.controls[k].get_value() || '';
// 		});

// 		await this._load_filter_options(true);

// 		const fo = this.filter_options;
// 		const new_opts = {
// 			year:     fo.financial_years || [],
// 			partner:  (fo.partners || []).map(p => p.name),
// 			grant:    fo.grants    || [],
// 			state:    fo.states    || [],
// 			district: fo.districts || [],
// 			block:    fo.blocks    || [],
// 			month:    fo.months    || [],
// 			quarter:  fo.quarters  || [],
// 		};

// 		Object.keys(this.controls).forEach(k => {
// 			const ctrl = this.controls[k];
// 			const opts = new_opts[k] || [];
// 			const valid_set = new Set(opts);

// 			ctrl.df.options = opts.join('\n');
// 			ctrl.refresh();

// 			// Restore only values still present in the new option list
// 			const prev = saved[k] || '';
// 			if (prev) {
// 				const valid = prev.split(',').map(v => v.trim()).filter(v => valid_set.has(v)).join(',');
// 				if (valid) ctrl.set_value(valid);
// 			}
// 		});
// 	}

// 	// Helper: build args object for cascade call (partner names → IDs)
// 	_filters_for_cascade() {
// 		const get = (k) => (this.controls[k] && this.controls[k].get_value()) || '';
// 		const partner_ids = get('partner')
// 			.split(',').map(n => this.partner_name_to_id[n.trim()]).filter(Boolean).join(',');
// 		return {
// 			financial_year: get('year'),
// 			partner_id:     partner_ids,
// 			grant_id:       get('grant'),
// 			state:          get('state'),
// 			district:       get('district'),
// 			block:          get('block'),
// 		};
// 	}

// 	// ── Active filter object ─────────────────────────────────────────────────

// 	_active_filters() {
// 		const get = (k) => (this.controls[k] && this.controls[k].get_value()) || '';
// 		// Convert partner display-names back to IDs for backend
// 		const partner_ids = get('partner')
// 			.split(',').map(n => this.partner_name_to_id[n.trim()]).filter(Boolean).join(',');
// 		return {
// 			financial_year: get('year'),
// 			partner_id:     partner_ids,
// 			grant_id:       get('grant'),
// 			state:          get('state'),
// 			district:       get('district'),
// 			block:          get('block'),
// 			month:          get('month'),
// 			quarter:        get('quarter'),
// 		};
// 	}

// 	// ── Main refresh ─────────────────────────────────────────────────────────

// 	async refresh() {
// 		this.level = 0;
// 		this.ctx   = { partner_id: null, partner_name: null, budget_id: null, budget_name: null };
// 		this.active_card = null;
// 		const f = this._active_filters();
// 		this._set_loading(true);
// 		try {
// 			const [sumR, tableR] = await Promise.all([
// 				frappe.call({ method: 'creche_reports.api.dashboard.get_dashboard_summary', args: f }),
// 				frappe.call({ method: 'creche_reports.api.dashboard.get_partner_breakdown',  args: f }),
// 			]);
// 			this._render_cards(sumR.message || {});
// 			this._render_table_partner(tableR.message || []);
// 		} finally {
// 			this._set_loading(false);
// 		}
// 	}

// 	// ── Cards ────────────────────────────────────────────────────────────────

// 	_render_cards(s) {
// 		const cards = [
// 			{
// 				key:     'budget',
// 				color:   '#1a73e8',
// 				label:   'Budget',
// 				value:   s.total_budget,
// 				sub:     `${s.total_partners || 0} partner${s.total_partners === 1 ? '' : 's'}`,
// 				compact: true,
// 			},
// 			{
// 				key:     'utilisation',
// 				color:   '#0f9d58',
// 				label:   'Utilisation',
// 				value:   s.total_utilisation,
// 				sub:     this._pct(s.total_utilisation, s.total_budget) + ' of budget',
// 				compact: true,
// 			},
// 			{
// 				key:     'disbursed',
// 				color:   '#f4511e',
// 				label:   'Disbursed',
// 				value:   s.total_disbursed,
// 				sub:     this._pct(s.total_disbursed, s.total_budget) + ' of budget',
// 				compact: true,
// 			},
// 			{
// 				key:     'balance',
// 				color:   '#7b1fa2',
// 				label:   'Balance Available',
// 				value:   s.balance_available,
// 				sub:     'Budget − Utilised',
// 				compact: true,
// 			},
// 			{
// 				key:     'delinquent',
// 				color:   '#d32f2f',
// 				label:   'Delinquent Partners',
// 				value:   s.delinquent_partners,
// 				sub:     'Missing 100% utilisation declaration',
// 				is_count: true,
// 			},
// 			{
// 				key:     'bank',
// 				color:   '#00695c',
// 				label:   'Balance as per Bank',
// 				value:   s.total_balance_bank,
// 				sub:     'Bank + Cash at end of reported month',
// 				compact: true,
// 			},
// 		];

// 		this.$cards.empty();
// 		cards.forEach(c => {
// 			const display = c.is_count
// 				? (c.value || 0)
// 				: this._fmt_inr(c.value, c.compact);

// 			const is_active = this.active_card === c.key;
// 			const $card = $(`
// 				<div class="fd-card${is_active ? ' fd-card-active' : ''}" data-card="${c.key}"
// 				     style="--card-color:${c.color}">
// 					<div class="fd-card-accent"></div>
// 					<div class="fd-card-body">
// 						<div class="fd-card-label">${c.label}</div>
// 						<div class="fd-card-value">${display}</div>
// 						<div class="fd-card-sub">${c.sub}</div>
// 						<div class="fd-card-link">View Line Items &#9654;</div>
// 					</div>
// 				</div>
// 			`);

// 			$card.on('click', () => this._on_card_click(c.key));
// 			this.$cards.append($card);
// 		});
// 	}

// 	async _on_card_click(card_key) {
// 		this.active_card = card_key;
// 		// Re-render cards to highlight active
// 		const sumR = await frappe.call({
// 			method: 'creche_reports.api.dashboard.get_dashboard_summary',
// 			args: this._active_filters(),
// 		});
// 		this._render_cards(sumR.message || {});

// 		// Fetch & render partner table (sorted by the clicked metric)
// 		const tableR = await frappe.call({
// 			method: 'creche_reports.api.dashboard.get_partner_breakdown',
// 			args: this._active_filters(),
// 		});
// 		const sort_key_map = {
// 			budget:      'total_budget',
// 			utilisation: 'total_utilisation',
// 			disbursed:   'total_disbursed',
// 			balance:     'balance_available',
// 			delinquent:  'delinquent_flag',
// 			bank:        'balance_bank',
// 		};
// 		const data = (tableR.message || []).sort(
// 			(a, b) => (b[sort_key_map[card_key]] || 0) - (a[sort_key_map[card_key]] || 0)
// 		);
// 		this.level = 0;
// 		this._render_table_partner(data);
// 		// Scroll to table
// 		$('html,body').animate({ scrollTop: this.$root.find('#fd-table-section').offset().top - 80 }, 300);
// 	}

// 	// ── Breadcrumb ───────────────────────────────────────────────────────────

// 	_render_breadcrumb() {
// 		const parts = [];
// 		parts.push(`<span class="fd-crumb-item fd-crumb-link" data-level="0">All Partners</span>`);
// 		if (this.ctx.partner_id) {
// 			parts.push('<span class="fd-crumb-sep">›</span>');
// 			if (this.level === 1) {
// 				parts.push(`<span class="fd-crumb-item fd-crumb-current">${this._esc(this.ctx.partner_name)}</span>`);
// 			} else {
// 				parts.push(`<span class="fd-crumb-item fd-crumb-link" data-level="1">${this._esc(this.ctx.partner_name)}</span>`);
// 			}
// 		}
// 		if (this.ctx.budget_id) {
// 			parts.push('<span class="fd-crumb-sep">›</span>');
// 			parts.push(`<span class="fd-crumb-item fd-crumb-current">${this._esc(this.ctx.budget_name)}</span>`);
// 		}

// 		this.$crumb.html(parts.join(''));
// 		this.$crumb.find('[data-level]').on('click', (e) => {
// 			const lvl = +$(e.currentTarget).data('level');
// 			this._nav_to(lvl);
// 		});
// 	}

// 	async _nav_to(lvl) {
// 		if (lvl === 0) {
// 			const tableR = await frappe.call({
// 				method: 'creche_reports.api.dashboard.get_partner_breakdown',
// 				args: this._active_filters(),
// 			});
// 			this.level = 0;
// 			this.ctx.partner_id = null;
// 			this.ctx.partner_name = null;
// 			this.ctx.budget_id = null;
// 			this.ctx.budget_name = null;
// 			this._render_table_partner(tableR.message || []);
// 		} else if (lvl === 1 && this.ctx.partner_id) {
// 			const args = { ...this._active_filters(), partner_id: this.ctx.partner_id };
// 			const tableR = await frappe.call({
// 				method: 'creche_reports.api.dashboard.get_budget_breakdown',
// 				args,
// 			});
// 			this.level = 1;
// 			this.ctx.budget_id = null;
// 			this.ctx.budget_name = null;
// 			this._render_table_budget(tableR.message || []);
// 		}
// 	}

// 	// ── Partner table (Level 0) ──────────────────────────────────────────────

// 	_render_table_partner(data) {
// 		this.level = 0;
// 		this._render_breadcrumb();

// 		const cols = [
// 			{ key: '#',                 label: '#',                  cls: 'fd-td-num',  sortable: false },
// 			{ key: 'partner_name',      label: 'Partner',            cls: 'fd-td-main', sortable: true  },
// 			{ key: 'states',            label: 'State(s)',            cls: '',           sortable: true  },
// 			{ key: 'districts',         label: 'District(s)',         cls: 'fd-td-muted', sortable: false },
// 			{ key: 'blocks',            label: 'Block(s)',            cls: 'fd-td-muted', sortable: false },
// 			{ key: 'grant_ids',         label: 'Grant(s)',            cls: 'fd-td-muted', sortable: false },
// 			{ key: 'no_of_creches',     label: '# Creches',          cls: 'fd-td-right', sortable: true  },
// 			{ key: 'months_submitted',  label: 'Months Submitted',   cls: 'fd-td-right', sortable: true  },
// 			{ key: 'total_budget',      label: 'Budget',             cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'total_disbursed',   label: 'Disbursed',          cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'total_utilisation', label: 'Utilised',           cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'balance_available', label: 'Balance Avail.',     cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'balance_bank',      label: 'Bank Balance',       cls: 'fd-td-right fd-td-currency', sortable: true },
// 		];

// 		const total = this._totals_partner(data);

// 		const rows = data.map((row, i) => {
// 			const tds = cols.map(c => {
// 				if (c.key === '#') return `<td class="fd-td-num">${i + 1}</td>`;
// 				if (c.key === 'partner_name') {
// 					return `<td class="${c.cls}">
// 						<span class="fd-drill-link" data-pid="${this._esc(row.partner_id)}"
// 						      data-pname="${this._esc(row.partner_name)}">${this._esc(row.partner_name)}</span>
// 					</td>`;
// 				}
// 				if (['total_budget','total_disbursed','total_utilisation','balance_available','balance_bank'].includes(c.key)) {
// 					const neg = (row[c.key] || 0) < 0;
// 					return `<td class="${c.cls}${neg ? ' fd-neg' : ''}">${this._fmt_inr(row[c.key], false)}</td>`;
// 				}
// 				return `<td class="${c.cls}">${row[c.key] != null ? this._esc(String(row[c.key])) : '—'}</td>`;
// 			});
// 			return `<tr>${tds.join('')}</tr>`;
// 		});

// 		const totals_row = `
// 			<tr class="fd-total-row">
// 				<td></td>
// 				<td class="fd-td-main"><strong>Total</strong></td>
// 				<td></td><td></td><td></td><td></td>
// 				<td class="fd-td-right"><strong>${total.no_of_creches}</strong></td>
// 				<td class="fd-td-right"><strong>${total.months}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.budget)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.disbursed)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.utilised)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.balance)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.bank)}</strong></td>
// 			</tr>
// 		`;

// 		this.$table.html(this._table_html(cols, rows, totals_row, data.length));

// 		// Drill-down click
// 		this.$table.find('.fd-drill-link').on('click', (e) => {
// 			const $t = $(e.currentTarget);
// 			this._drill_to_budget($t.data('pid'), $t.data('pname'));
// 		});

// 		this._bind_sort(cols, data, (sorted) => this._render_table_partner(sorted));
// 	}

// 	_totals_partner(data) {
// 		return {
// 			no_of_creches: data.reduce((s, r) => s + (r.no_of_creches || 0), 0),
// 			months:        data.reduce((s, r) => s + (r.months_submitted || 0), 0),
// 			budget:        data.reduce((s, r) => s + (r.total_budget || 0), 0),
// 			disbursed:     data.reduce((s, r) => s + (r.total_disbursed || 0), 0),
// 			utilised:      data.reduce((s, r) => s + (r.total_utilisation || 0), 0),
// 			balance:       data.reduce((s, r) => s + (r.balance_available || 0), 0),
// 			bank:          data.reduce((s, r) => s + (r.balance_bank || 0), 0),
// 		};
// 	}

// 	// ── Budget table (Level 1) ───────────────────────────────────────────────

// 	async _drill_to_budget(partner_id, partner_name) {
// 		this.ctx.partner_id   = partner_id;
// 		this.ctx.partner_name = partner_name;
// 		this.ctx.budget_id    = null;
// 		this.ctx.budget_name  = null;
// 		this._set_loading(true);
// 		try {
// 			const args = { ...this._active_filters(), partner_id };
// 			const r = await frappe.call({
// 				method: 'creche_reports.api.dashboard.get_budget_breakdown',
// 				args,
// 			});
// 			this._render_table_budget(r.message || []);
// 		} finally {
// 			this._set_loading(false);
// 		}
// 	}

// 	_render_table_budget(data) {
// 		this.level = 1;
// 		this._render_breadcrumb();

// 		const cols = [
// 			{ key: '#',                  label: '#',                cls: 'fd-td-num',  sortable: false },
// 			{ key: 'grant_id',           label: 'Grant ID',         cls: 'fd-td-main', sortable: true  },
// 			{ key: 'budget_reference_name', label: 'Reference',     cls: 'fd-td-muted', sortable: true },
// 			{ key: 'state',              label: 'State',            cls: '',           sortable: true  },
// 			{ key: 'district',           label: 'District',         cls: 'fd-td-muted', sortable: true },
// 			{ key: 'block',              label: 'Block',            cls: 'fd-td-muted', sortable: true },
// 			{ key: 'financial_year',     label: 'FY',               cls: '',           sortable: true  },
// 			{ key: 'no_of_creches',      label: '# Creches',        cls: 'fd-td-right', sortable: true },
// 			{ key: 'months_submitted',   label: 'Months',           cls: 'fd-td-right', sortable: true },
// 			{ key: 'total_budget',       label: 'Budget',           cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'total_disbursed',    label: 'Disbursed',        cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'total_utilisation',  label: 'Utilised',         cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'balance_available',  label: 'Balance Avail.',   cls: 'fd-td-right fd-td-currency', sortable: true },
// 			{ key: 'balance_bank',       label: 'Bank Balance',     cls: 'fd-td-right fd-td-currency', sortable: true },
// 		];

// 		const total = {
// 			budget:    data.reduce((s, r) => s + (r.total_budget || 0), 0),
// 			disbursed: data.reduce((s, r) => s + (r.total_disbursed || 0), 0),
// 			utilised:  data.reduce((s, r) => s + (r.total_utilisation || 0), 0),
// 			balance:   data.reduce((s, r) => s + (r.balance_available || 0), 0),
// 			bank:      data.reduce((s, r) => s + (r.balance_bank || 0), 0),
// 		};

// 		const rows = data.map((row, i) => {
// 			const tds = cols.map(c => {
// 				if (c.key === '#') return `<td class="fd-td-num">${i + 1}</td>`;
// 				if (c.key === 'grant_id') {
// 					return `<td class="${c.cls}">
// 						<span class="fd-drill-link" data-bid="${this._esc(row.budget_reference_id)}"
// 						      data-bname="${this._esc(row.grant_id || row.budget_reference_name)}">${this._esc(row.grant_id || '—')}</span>
// 					</td>`;
// 				}
// 				if (['total_budget','total_disbursed','total_utilisation','balance_available','balance_bank'].includes(c.key)) {
// 					const neg = (row[c.key] || 0) < 0;
// 					return `<td class="${c.cls}${neg ? ' fd-neg' : ''}">${this._fmt_inr(row[c.key], false)}</td>`;
// 				}
// 				return `<td class="${c.cls}">${row[c.key] != null ? this._esc(String(row[c.key])) : '—'}</td>`;
// 			});
// 			return `<tr>${tds.join('')}</tr>`;
// 		});

// 		const totals_row = `
// 			<tr class="fd-total-row">
// 				<td></td><td class="fd-td-main"><strong>Total</strong></td>
// 				<td></td><td></td><td></td><td></td><td></td><td></td><td></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.budget)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.disbursed)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.utilised)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.balance)}</strong></td>
// 				<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(total.bank)}</strong></td>
// 			</tr>
// 		`;

// 		this.$table.html(this._table_html(cols, rows, totals_row, data.length));

// 		this.$table.find('.fd-drill-link').on('click', (e) => {
// 			const $t = $(e.currentTarget);
// 			this._drill_to_expense_breakdown($t.data('bid'), $t.data('bname'));
// 		});

// 		this._bind_sort(cols, data, (sorted) => this._render_table_budget(sorted));
// 	}

// 	// ── Expense Breakdown (Level 2) ──────────────────────────────────────────

// 	async _drill_to_expense_breakdown(budget_id, budget_name) {
// 		this.ctx.budget_id   = budget_id;
// 		this.ctx.budget_name = budget_name;
// 		this._set_loading(true);
// 		try {
// 			const af = this._active_filters();
// 			const r = await frappe.call({
// 				method: 'creche_reports.api.dashboard.get_budget_expense_breakdown',
// 				args: {
// 					budget_reference_id: budget_id,
// 					month:   af.month   || '',
// 					quarter: af.quarter || '',
// 				},
// 			});
// 			this._render_expense_breakdown(r.message || {});
// 		} finally {
// 			this._set_loading(false);
// 		}
// 	}

// 	_render_expense_breakdown(data) {
// 		this.level = 2;
// 		this._render_breadcrumb();

// 		const expenses = data.expense_breakdown || [];
// 		const months   = data.monthly_summary  || [];

// 		// ── Section 1: Expense line items ──
// 		const exp_cols = [
// 			{ label: '#',                   cls: 'fd-td-num'   },
// 			{ label: 'Expense Type',         cls: 'fd-td-main'  },
// 			{ label: 'Main Head',            cls: ''            },
// 			{ label: 'Sub Head',             cls: 'fd-td-muted' },
// 			{ label: 'Year 1',               cls: 'fd-td-right fd-td-currency' },
// 			{ label: 'Year 2',               cls: 'fd-td-right fd-td-currency' },
// 			{ label: 'Year 3',               cls: 'fd-td-right fd-td-currency' },
// 			{ label: 'Total Budget',         cls: 'fd-td-right fd-td-currency fd-col-highlight' },
// 			{ label: 'Cur. Year Budget',     cls: 'fd-td-right fd-td-currency' },
// 			{ label: 'Monthly Budget',       cls: 'fd-td-right fd-td-currency' },
// 			{ label: 'Budget to Date',       cls: 'fd-td-right fd-td-currency fd-col-highlight' },
// 			{ label: 'Total Utilised',       cls: 'fd-td-right fd-td-currency fd-col-highlight' },
// 			{ label: 'Balance',              cls: 'fd-td-right fd-td-currency' },
// 			{ label: '% Utilised',           cls: 'fd-td-right' },
// 		];

// 		const exp_th = exp_cols.map(c =>
// 			`<th class="${c.cls}">${c.label}</th>`
// 		).join('');

// 		const exp_rows = expenses.map((e, i) => {
// 			const neg   = (e.balance || 0) < 0;
// 			const pct   = e.pct_utilised || 0;
// 			const bar_w = Math.min(100, Math.max(0, pct));
// 			const bar_color = pct > 100 ? '#d32f2f' : pct > 85 ? '#f4511e' : '#0f9d58';
// 			return `<tr>
// 				<td class="fd-td-num">${i + 1}</td>
// 				<td class="fd-td-main">${this._esc(e.type_of_expenses || '—')}</td>
// 				<td>${this._esc(e.budget_main_head || '—')}</td>
// 				<td class="fd-td-muted">${this._esc(e.budget_sub_head || '—')}</td>
// 				<td class="fd-td-right fd-td-currency">${this._fmt_inr(e.year_1)}</td>
// 				<td class="fd-td-right fd-td-currency">${this._fmt_inr(e.year_2)}</td>
// 				<td class="fd-td-right fd-td-currency">${this._fmt_inr(e.year_3)}</td>
// 				<td class="fd-td-right fd-td-currency fd-col-highlight"><strong>${this._fmt_inr(e.total_budget)}</strong></td>
// 				<td class="fd-td-right fd-td-currency">${this._fmt_inr(e.current_year_budget)}</td>
// 				<td class="fd-td-right fd-td-currency">${this._fmt_inr(e.monthly_budget)}</td>
// 				<td class="fd-td-right fd-td-currency fd-col-highlight">${this._fmt_inr(e.budget_to_date)}</td>
// 				<td class="fd-td-right fd-td-currency fd-col-highlight"><strong>${this._fmt_inr(e.total_utilised)}</strong></td>
// 				<td class="fd-td-right fd-td-currency${neg ? ' fd-neg' : ''}">${this._fmt_inr(e.balance)}</td>
// 				<td class="fd-td-right">
// 					<div class="fd-pct-wrap">
// 						<div class="fd-pct-bar" style="width:${bar_w}%;background:${bar_color}"></div>
// 						<span class="fd-pct-lbl">${pct}%</span>
// 					</div>
// 				</td>
// 			</tr>`;
// 		});

// 		// Expense totals
// 		const et = expenses.reduce((s, e) => ({
// 			y1: s.y1 + (e.year_1 || 0), y2: s.y2 + (e.year_2 || 0), y3: s.y3 + (e.year_3 || 0),
// 			tb: s.tb + (e.total_budget || 0), cyb: s.cyb + (e.current_year_budget || 0),
// 			mb: s.mb + (e.monthly_budget || 0), btd: s.btd + (e.budget_to_date || 0),
// 			tu: s.tu + (e.total_utilised || 0), bal: s.bal + (e.balance || 0),
// 		}), { y1:0, y2:0, y3:0, tb:0, cyb:0, mb:0, btd:0, tu:0, bal:0 });

// 		const exp_foot = `<tr class="fd-total-row">
// 			<td></td><td class="fd-td-main"><strong>Total</strong></td>
// 			<td></td><td></td>
// 			<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(et.y1)}</strong></td>
// 			<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(et.y2)}</strong></td>
// 			<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(et.y3)}</strong></td>
// 			<td class="fd-td-right fd-td-currency fd-col-highlight"><strong>${this._fmt_inr(et.tb)}</strong></td>
// 			<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(et.cyb)}</strong></td>
// 			<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(et.mb)}</strong></td>
// 			<td class="fd-td-right fd-td-currency fd-col-highlight"><strong>${this._fmt_inr(et.btd)}</strong></td>
// 			<td class="fd-td-right fd-td-currency fd-col-highlight"><strong>${this._fmt_inr(et.tu)}</strong></td>
// 			<td class="fd-td-right fd-td-currency${et.bal < 0 ? ' fd-neg' : ''}"><strong>${this._fmt_inr(et.bal)}</strong></td>
// 			<td></td>
// 		</tr>`;

// 		const section1 = `
// 			<div class="fd-section-label">
// 				Expense Line Items — Budget vs Utilisation
// 				<span class="fd-count-badge">${expenses.length} expense type${expenses.length === 1 ? '' : 's'}</span>
// 			</div>
// 			<div class="fd-table-scroll" style="margin-bottom:28px">
// 				<table>
// 					<thead><tr>${exp_th}</tr></thead>
// 					<tbody>${exp_rows.join('')}</tbody>
// 					<tfoot>${exp_foot}</tfoot>
// 				</table>
// 			</div>
// 		`;

// 		// ── Section 2: Monthly summary (expandable expense sub-rows) ──
// 		const mo_th = `
// 			<th class="fd-td-num">#</th>
// 			<th class="fd-td-main">Month</th>
// 			<th>Financial Year</th>
// 			<th class="fd-td-right fd-td-currency">Monthly Budget</th>
// 			<th class="fd-td-right fd-td-currency">Actual Utilised</th>
// 			<th class="fd-td-right fd-td-currency">Variance</th>
// 			<th class="fd-td-right">% Utilised</th>
// 			<th class="fd-td-right fd-td-currency">Bank Balance</th>
// 			<th class="fd-td-center">Declaration</th>
// 			<th class="fd-td-center" style="width:40px">▼</th>
// 		`;

// 		const mo_rows = months.map((m, i) => {
// 			const pct     = m.pct_utilised || 0;
// 			const bar_w   = Math.min(100, Math.max(0, pct));
// 			const bar_col = pct > 100 ? '#d32f2f' : pct > 85 ? '#f4511e' : '#0f9d58';
// 			const neg     = (m.balance || 0) < 0;
// 			const decl    = m.declaration
// 				? `<span class="fd-pill fd-pill-yes">✓ Declared</span>`
// 				: `<span class="fd-pill fd-pill-no">Pending</span>`;

// 			// Sub-rows for expense detail
// 			const sub_th = `<th></th><th>Expense Type</th><th>Main Head</th><th>Sub Head</th>
// 				<th class="fd-td-right fd-td-currency">Monthly Budget</th>
// 				<th class="fd-td-right fd-td-currency">Utilised</th>
// 				<th class="fd-td-right fd-td-currency">Balance</th>
// 				<th></th><th></th><th></th>`;

// 			const sub_rows = (m.items || []).map(it => {
// 				const it_neg = (it.balance || 0) < 0;
// 				return `<tr class="fd-sub-row">
// 					<td></td>
// 					<td class="fd-td-muted" style="padding-left:24px">${this._esc(it.type_of_expenses || '—')}</td>
// 					<td class="fd-td-muted">${this._esc(it.budget_main_head || '—')}</td>
// 					<td class="fd-td-muted">${this._esc(it.budget_sub_head || '—')}</td>
// 					<td class="fd-td-right fd-td-currency fd-td-muted">${this._fmt_inr(it.monthly_budget)}</td>
// 					<td class="fd-td-right fd-td-currency">${this._fmt_inr(it.utilised)}</td>
// 					<td class="fd-td-right fd-td-currency${it_neg ? ' fd-neg' : ''}">${this._fmt_inr(it.balance)}</td>
// 					<td></td><td></td><td></td>
// 				</tr>`;
// 			}).join('');

// 			const sub_html = m.items && m.items.length
// 				? `<tr class="fd-sub-header fd-month-detail-${i}" style="display:none">
// 						<thead><tr>${sub_th}</tr></thead>
// 					</tr>
// 					<tr class="fd-month-detail-${i}" style="display:none">
// 						<td colspan="10" style="padding:0">
// 							<table style="width:100%;border-collapse:separate;border-spacing:0">
// 								<thead><tr class="fd-sub-thead">${sub_th}</tr></thead>
// 								<tbody>${sub_rows}</tbody>
// 							</table>
// 						</td>
// 					</tr>`
// 				: '';

// 			return `
// 				<tr class="fd-month-row" data-idx="${i}">
// 					<td class="fd-td-num">${i + 1}</td>
// 					<td class="fd-td-main"><strong>${this._esc(m.month || '—')}</strong></td>
// 					<td>${this._esc(m.financial_year || '—')}</td>
// 					<td class="fd-td-right fd-td-currency">${this._fmt_inr(m.monthly_budget)}</td>
// 					<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(m.total_utilised)}</strong></td>
// 					<td class="fd-td-right fd-td-currency${neg ? ' fd-neg' : ''}">${this._fmt_inr(m.balance)}</td>
// 					<td class="fd-td-right">
// 						<div class="fd-pct-wrap">
// 							<div class="fd-pct-bar" style="width:${bar_w}%;background:${bar_col}"></div>
// 							<span class="fd-pct-lbl">${pct}%</span>
// 						</div>
// 					</td>
// 					<td class="fd-td-right fd-td-currency fd-td-muted">${this._fmt_inr(m.balance_amount)}</td>
// 					<td class="fd-td-center">${decl}</td>
// 					<td class="fd-td-center fd-month-toggle" data-idx="${i}" style="cursor:pointer;color:#1a73e8;font-weight:700">▶</td>
// 				</tr>
// 				${sub_html}
// 			`;
// 		});

// 		const mt = months.reduce((s, m) => ({
// 			mb:  s.mb  + (m.monthly_budget  || 0),
// 			tu:  s.tu  + (m.total_utilised  || 0),
// 			bal: s.bal + (m.balance         || 0),
// 		}), { mb:0, tu:0, bal:0 });

// 		const mo_foot = `<tr class="fd-total-row">
// 			<td></td><td class="fd-td-main"><strong>Total (${months.length} months)</strong></td>
// 			<td></td>
// 			<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(mt.mb)}</strong></td>
// 			<td class="fd-td-right fd-td-currency"><strong>${this._fmt_inr(mt.tu)}</strong></td>
// 			<td class="fd-td-right fd-td-currency${mt.bal < 0 ? ' fd-neg' : ''}"><strong>${this._fmt_inr(mt.bal)}</strong></td>
// 			<td></td><td></td><td></td><td></td>
// 		</tr>`;

// 		const section2 = months.length ? `
// 			<div class="fd-section-label" style="margin-top:4px">
// 				Monthly Breakdown
// 				<span class="fd-count-badge">${months.length} month${months.length === 1 ? '' : 's'}</span>
// 			</div>
// 			<div class="fd-table-scroll">
// 				<table>
// 					<thead><tr>${mo_th}</tr></thead>
// 					<tbody>${mo_rows.join('')}</tbody>
// 					<tfoot>${mo_foot}</tfoot>
// 				</table>
// 			</div>
// 		` : `<div class="fd-empty"><div class="fd-empty-icon">📋</div>No utilisation records found for this budget in the selected period.</div>`;

// 		this.$table.html(section1 + section2);

// 		// Toggle monthly expense sub-rows
// 		this.$table.on('click', '.fd-month-toggle', (e) => {
// 			const idx  = $(e.currentTarget).data('idx');
// 			const $det = this.$table.find(`.fd-month-detail-${idx}`);
// 			const open = $det.is(':visible');
// 			$det.toggle(!open);
// 			$(e.currentTarget).text(open ? '▶' : '▼');
// 		});
// 	}

// 	// ── Table HTML builder ───────────────────────────────────────────────────

// 	_table_html(cols, rows, totals_row, count) {
// 		const level_labels = ['All Partners', 'Budgets / Grants', 'Budget vs Utilisation'];
// 		const th = cols.map(c => {
// 			const sort_icon = c.sortable
// 				? `<span class="fd-sort-icon" data-col="${c.key}">⇅</span>`
// 				: '';
// 			return `<th class="${c.cls || ''}" data-col="${c.key}">${c.label}${sort_icon}</th>`;
// 		}).join('');

// 		if (!count) {
// 			return `
// 				<div class="fd-section-label">${level_labels[this.level]}</div>
// 				<div class="fd-empty"><div class="fd-empty-icon">📋</div>No records found for the selected filters.</div>
// 			`;
// 		}

// 		return `
// 			<div class="fd-section-label">${level_labels[this.level]}
// 				<span class="fd-count-badge">${count} record${count === 1 ? '' : 's'}</span>
// 			</div>
// 			<div class="fd-table-scroll">
// 				<table>
// 					<thead><tr>${th}</tr></thead>
// 					<tbody>${rows.join('')}</tbody>
// 					<tfoot>${totals_row}</tfoot>
// 				</table>
// 			</div>
// 		`;
// 	}

// 	// ── Sortable columns ─────────────────────────────────────────────────────

// 	_bind_sort(cols, data, render_fn) {
// 		this.$table.find('th[data-col]').on('click', (e) => {
// 			const col = $(e.currentTarget).data('col');
// 			const def = cols.find(c => c.key === col);
// 			if (!def || !def.sortable) return;
// 			if (this.sort_col === col) {
// 				this.sort_dir = this.sort_dir === 'asc' ? 'desc' : 'asc';
// 			} else {
// 				this.sort_col = col;
// 				this.sort_dir = 'desc';
// 			}
// 			const d = this.sort_dir === 'asc' ? 1 : -1;
// 			const sorted = [...data].sort((a, b) => {
// 				const av = a[col] ?? '';
// 				const bv = b[col] ?? '';
// 				return typeof av === 'number' ? (av - bv) * d : String(av).localeCompare(String(bv)) * d;
// 			});
// 			render_fn(sorted);
// 		});
// 	}

// 	// ── Utilities ────────────────────────────────────────────────────────────

// 	_fmt_inr(amount, compact = false) {
// 		const n = parseFloat(amount) || 0;
// 		const abs = Math.abs(n);
// 		const sign = n < 0 ? '-' : '';
// 		if (compact) {
// 			if (abs >= 1e7) return sign + '₹' + (abs / 1e7).toFixed(2) + ' Cr';
// 			if (abs >= 1e5) return sign + '₹' + (abs / 1e5).toFixed(2) + ' L';
// 		}
// 		return sign + '₹' + abs.toLocaleString('en-IN', { maximumFractionDigits: 2 });
// 	}

// 	_pct(num, den) {
// 		if (!den) return '0%';
// 		return (((num || 0) / den) * 100).toFixed(1) + '%';
// 	}

// 	_esc(str) {
// 		return String(str || '')
// 			.replace(/&/g, '&amp;')
// 			.replace(/</g, '&lt;')
// 			.replace(/>/g, '&gt;')
// 			.replace(/"/g, '&quot;');
// 	}

// 	_set_loading(on) {
// 		if (on) {
// 			this.$el.addClass('fd-loading');
// 		} else {
// 			this.$el.removeClass('fd-loading');
// 		}
// 	}

// 	// ── CSS ──────────────────────────────────────────────────────────────────

// 	_styles() {
// 		return `<style>
// /* ── Reset & Base ── */
// .fd-wrap * { box-sizing: border-box; }
// .fd-wrap { font-family: var(--font-stack); color: var(--text-color); padding: 20px 24px; max-width: 100%; }
// .fd-wrap.fd-loading { opacity: 0.6; pointer-events: none; }

// /* ── Filter Bar ── */
// .fd-filter-bar {
// 	background: var(--card-bg);
// 	border: 1px solid var(--border-color);
// 	border-radius: var(--border-radius-lg);
// 	padding: 16px 20px 12px;
// 	margin-bottom: 24px;
// }
// .fd-filter-grid {
// 	display: grid;
// 	grid-template-columns: repeat(4, 1fr);
// 	gap: 10px 14px;
// 	margin-bottom: 12px;
// }
// @media (max-width: 1100px) { .fd-filter-grid { grid-template-columns: repeat(3, 1fr); } }
// @media (max-width: 760px)  { .fd-filter-grid { grid-template-columns: repeat(2, 1fr); } }
// .fd-filter-field { min-width: 0; }
// .fd-filter-field .frappe-control { margin-bottom: 0; }
// .fd-bar-btns {
// 	display: flex;
// 	gap: 8px;
// 	align-items: center;
// 	padding-top: 4px;
// }
// .fd-btn {
// 	padding: 6px 18px;
// 	border-radius: 6px;
// 	font-size: 13px;
// 	font-weight: 600;
// 	cursor: pointer;
// 	font-family: var(--font-stack);
// 	transition: all 0.15s;
// 	border: none;
// }
// .fd-btn-primary { background: #1a4f8a; color: #fff; }
// .fd-btn-primary:hover { background: #163f70; }
// .fd-btn-ghost {
// 	background: var(--card-bg);
// 	color: var(--text-muted);
// 	border: 1px solid var(--border-color);
// }
// .fd-btn-ghost:hover { background: var(--subtle-fg); }

// /* ── Summary Cards ── */
// .fd-cards-grid {
// 	display: grid;
// 	grid-template-columns: repeat(3, 1fr);
// 	gap: 16px;
// 	margin-bottom: 28px;
// }
// @media (max-width: 1100px) { .fd-cards-grid { grid-template-columns: repeat(2, 1fr); } }
// @media (max-width: 640px)  { .fd-cards-grid { grid-template-columns: 1fr; } }

// .fd-card {
// 	background: var(--card-bg);
// 	border: 1px solid var(--border-color);
// 	border-radius: var(--border-radius-lg);
// 	display: flex;
// 	overflow: hidden;
// 	cursor: pointer;
// 	transition: box-shadow 0.18s;
// 	box-shadow: 0 1px 4px rgba(0,0,0,0.06);
// 	min-height: 110px;
// }
// .fd-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
// .fd-card.fd-card-active {
// 	border-color: var(--card-color);
// 	box-shadow: 0 0 0 2px var(--card-color);
// }
// .fd-card-accent {
// 	width: 5px;
// 	background: var(--card-color);
// 	flex-shrink: 0;
// }
// .fd-card-body {
// 	padding: 18px 20px;
// 	flex: 1;
// 	min-width: 0;
// }
// .fd-card-label {
// 	font-size: 10px;
// 	font-weight: 700;
// 	color: var(--text-muted);
// 	text-transform: uppercase;
// 	letter-spacing: 0.09em;
// 	margin-bottom: 6px;
// }
// .fd-card-value {
// 	font-size: 26px;
// 	font-weight: 800;
// 	color: var(--text-color);
// 	line-height: 1.1;
// 	margin-bottom: 4px;
// 	white-space: nowrap;
// 	overflow: hidden;
// 	text-overflow: ellipsis;
// }
// .fd-card-sub {
// 	font-size: 11px;
// 	color: var(--text-muted);
// 	margin-bottom: 10px;
// }
// .fd-card-link {
// 	font-size: 11px;
// 	font-weight: 700;
// 	color: #1a73e8;
// 	text-transform: uppercase;
// 	letter-spacing: 0.05em;
// }
// .fd-card:hover .fd-card-link { text-decoration: underline; }

// /* ── Table Section ── */
// .fd-table-section {
// 	background: var(--card-bg);
// 	border: 1px solid var(--border-color);
// 	border-radius: var(--border-radius-lg);
// 	overflow: hidden;
// }
// .fd-table-header {
// 	display: flex;
// 	align-items: center;
// 	justify-content: space-between;
// 	padding: 14px 20px 12px;
// 	border-bottom: 1px solid var(--border-color);
// 	gap: 12px;
// 	flex-wrap: wrap;
// }
// .fd-breadcrumb {
// 	display: flex;
// 	align-items: center;
// 	gap: 4px;
// 	flex-wrap: wrap;
// 	font-size: 13px;
// }
// .fd-crumb-item { font-weight: 600; }
// .fd-crumb-link { color: #1a73e8; cursor: pointer; }
// .fd-crumb-link:hover { text-decoration: underline; }
// .fd-crumb-current { color: var(--text-color); }
// .fd-crumb-sep { color: var(--text-muted); font-size: 16px; }

// #fd-table-wrap { padding: 16px 20px; }
// .fd-section-label {
// 	font-size: 11px;
// 	font-weight: 700;
// 	color: var(--text-muted);
// 	text-transform: uppercase;
// 	letter-spacing: 0.08em;
// 	margin-bottom: 12px;
// 	display: flex;
// 	align-items: center;
// 	gap: 8px;
// }
// .fd-count-badge {
// 	background: var(--subtle-fg);
// 	border: 1px solid var(--border-color);
// 	border-radius: 10px;
// 	font-size: 10px;
// 	color: var(--text-muted);
// 	padding: 1px 8px;
// 	font-weight: 600;
// 	text-transform: none;
// 	letter-spacing: 0;
// }

// /* ── Table ── */
// .fd-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #c5cdd8; border-radius: 8px; }
// .fd-table-scroll table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: var(--text-sm); min-width: 900px; }
// .fd-table-scroll thead tr { background: #1a4f8a; }
// .fd-table-scroll thead th {
// 	padding: 11px 14px;
// 	text-align: left;
// 	font-size: 11px;
// 	font-weight: 700;
// 	color: #fff;
// 	text-transform: uppercase;
// 	letter-spacing: 0.06em;
// 	white-space: nowrap;
// 	border-right: 1px solid rgba(255,255,255,0.18);
// 	border-bottom: 1px solid rgba(255,255,255,0.12);
// 	position: sticky;
// 	top: 0;
// 	z-index: 2;
// 	cursor: default;
// 	user-select: none;
// }
// .fd-table-scroll thead th[data-col].fd-td-main,
// .fd-table-scroll thead th[data-col] { cursor: default; }
// .fd-table-scroll thead th:last-child { border-right: none; }
// .fd-table-scroll tbody tr { background: #fff; transition: background 0.1s; }
// .fd-table-scroll tbody tr:nth-child(even) { background: #f4f7fa; }
// .fd-table-scroll tbody tr:hover { background: #e8f0fb !important; }
// .fd-table-scroll tbody td {
// 	padding: 9px 14px;
// 	font-size: var(--text-sm);
// 	color: var(--text-color);
// 	border-right: 1px solid #dde3ea;
// 	border-bottom: 1px solid #dde3ea;
// 	white-space: nowrap;
// 	overflow: hidden;
// 	text-overflow: ellipsis;
// 	max-width: 240px;
// }
// .fd-table-scroll tbody tr:last-child td { border-bottom: none; }
// .fd-table-scroll tbody td:last-child { border-right: none; }
// .fd-table-scroll tfoot tr { background: #eef2f8; }
// .fd-table-scroll tfoot td {
// 	padding: 9px 14px;
// 	border-right: 1px solid #dde3ea;
// 	border-top: 2px solid #c5cdd8;
// 	white-space: nowrap;
// 	font-size: var(--text-sm);
// }
// .fd-table-scroll tfoot td:last-child { border-right: none; }
// .fd-total-row td { background: #eef2f8; }

// .fd-td-num    { text-align: center !important; width: 44px; font-weight: 600; font-size: 11px; color: var(--text-muted); }
// .fd-td-main   { font-weight: 600; color: var(--text-color); }
// .fd-td-muted  { color: var(--text-muted); font-size: 12px; }
// .fd-td-right  { text-align: right !important; }
// .fd-td-center { text-align: center !important; }
// .fd-td-currency { font-variant-numeric: tabular-nums; font-size: 12px; }
// .fd-neg { color: #d32f2f; }

// .fd-sort-icon { margin-left: 4px; opacity: 0.6; font-size: 10px; cursor: pointer; }

// .fd-drill-link {
// 	color: #1a73e8;
// 	cursor: pointer;
// 	font-weight: 600;
// }
// .fd-drill-link:hover { text-decoration: underline; }

// .fd-pill {
// 	display: inline-block;
// 	padding: 2px 10px;
// 	border-radius: 12px;
// 	font-size: 10px;
// 	font-weight: 700;
// }
// .fd-pill-yes { background: #dcfce7; color: #166534; }
// .fd-pill-no  { background: #fef3c7; color: #92400e; }

// .fd-empty {
// 	text-align: center;
// 	padding: 56px 20px;
// 	font-size: var(--text-sm);
// 	color: var(--text-muted);
// }
// .fd-empty-icon { font-size: 28px; margin-bottom: 8px; }

// /* ── Progress bar in table cell ── */
// .fd-pct-wrap {
// 	display: flex;
// 	align-items: center;
// 	gap: 6px;
// 	min-width: 90px;
// }
// .fd-pct-bar {
// 	height: 6px;
// 	border-radius: 3px;
// 	flex-shrink: 0;
// 	min-width: 2px;
// 	max-width: 60px;
// }
// .fd-pct-lbl { font-size: 11px; font-weight: 700; color: var(--text-color); white-space: nowrap; }

// /* ── Highlighted column ── */
// .fd-col-highlight { background: #f0f5fc !important; }
// .fd-total-row .fd-col-highlight { background: #e4edf8 !important; }

// /* ── Monthly sub-rows ── */
// .fd-sub-thead th {
// 	background: #e8f0fb !important;
// 	color: #1a4f8a;
// 	font-size: 10px;
// 	padding: 6px 14px;
// }
// .fd-sub-row td {
// 	background: #f8fafd;
// 	font-size: 11px;
// 	border-bottom: 1px solid #eef2f8 !important;
// }
// .fd-month-row:hover .fd-month-toggle { text-decoration: underline; }
// </style>`;
// 	}
// }




























// frappe.pages['creche-finance-dashboard'].on_page_load = function (wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Finance Dashboard',
// 		single_column: true,
// 	});
// 	new FinanceDashboard(page, wrapper);
// };

// class FinanceDashboard {
// 	constructor(page, wrapper) {
// 		this.page               = page;
// 		this.$root              = $(wrapper).find('.page-content');
// 		this.filter_options     = {};
// 		this.filter_values      = {};
// 		this.partner_name_to_id = {};
// 		this.summary_data       = {};
// 		this.init();
// 	}

// 	async init() {
// 		// Inject modal once into body
// 		if (!$('#fd-modal-overlay').length) {
// 			$('body').append(`
// 				<div id="fd-modal-overlay">
// 					<div id="fd-modal">
// 						<!-- Left sidebar: roadmap + partner nav -->
// 						<div id="fd-modal-sidebar">
// 							<div id="fd-modal-roadmap"></div>
// 							<div id="fd-modal-nav"></div>
// 						</div>
// 						<!-- Right main: header + table -->
// 						<div id="fd-modal-main">
// 							<div id="fd-modal-main-header">
// 								<div id="fd-modal-title-wrap">
// 									<div id="fd-modal-title"></div>
// 									<div id="fd-modal-subtitle"></div>
// 								</div>
// 								<button id="fd-modal-close">×</button>
// 							</div>
// 							<div id="fd-modal-body"></div>
// 						</div>
// 					</div>
// 				</div>
// 			`);
// 			$(document).on('click','#fd-modal-close', () => $('#fd-modal-overlay').removeClass('open'));
// 			$(document).on('click','#fd-modal-overlay', (e) => { if(e.target.id==='fd-modal-overlay') $('#fd-modal-overlay').removeClass('open'); });
// 		}

// 		this.$root.html(this._styles() + `
// 			<div id="fd-wrap" class="fd-wrap">
// 				<div class="fd-filter-bar" id="fd-filter-bar"></div>
// 				<div id="fd-cards"></div>
// 				<div id="fd-summary-bar"></div>
// 			</div>
// 		`);
// 		this.$el      = this.$root.find('#fd-wrap');
// 		this.$cards   = this.$root.find('#fd-cards');
// 		this.$bar     = this.$root.find('#fd-filter-bar');
// 		this.$summary = this.$root.find('#fd-summary-bar');

// 		await this._load_filter_options();
// 		this._render_filter_bar();
// 		await this.refresh();
// 	}

// 	// ─── Filter options ────────────────────────────────────────────────────────
// 	async _load_filter_options(cascade = false) {
// 		const args = cascade ? this._filters_for_cascade() : {};
// 		const r = await frappe.call({ method:'creche_reports.api.dashboard.get_dashboard_filters', args });
// 		this.filter_options = r.message || {};
// 		this.partner_name_to_id = {};
// 		(this.filter_options.partners||[]).forEach(p => { this.partner_name_to_id[p.name] = p.id; });
// 	}

// 	// ─── Filter bar ────────────────────────────────────────────────────────────
// 	_render_filter_bar() {
// 		const fo = this.filter_options;
// 		this.$bar.empty();
// 		const defs = [
// 			{ key:'year',     label:'Year',     opts:fo.financial_years||[] },
// 			{ key:'partner',  label:'Partner',  opts:(fo.partners||[]).map(p=>p.name) },
// 			{ key:'grant',    label:'Grant',    opts:fo.grants||[] },
// 			{ key:'state',    label:'State',    opts:fo.states||[] },
// 			{ key:'district', label:'District', opts:fo.districts||[] },
// 			{ key:'block',    label:'Block',    opts:fo.blocks||[] },
// 			{ key:'month',    label:'Month',    opts:fo.months||[] },
// 			{ key:'quarter',  label:'Quarter',  opts:fo.quarters||[] },
// 		];
// 		const $grid = $('<div class="fd-filter-grid"></div>');
// 		this.$bar.append($grid);
// 		defs.forEach(fd => {
// 			const $f = $(`<div class="fd-filter-field">
// 				<label class="fd-filter-label">${fd.label}</label>
// 				<div class="fd-ms-wrap" data-key="${fd.key}">
// 					<div class="fd-ms-box">
// 						<div class="fd-ms-tags" data-key="${fd.key}"></div>
// 						<input class="fd-ms-input" type="text" placeholder="${fd.opts.length?'Select...':'No options'}"
// 							autocomplete="off" data-key="${fd.key}" ${!fd.opts.length?'disabled':''}>
// 					</div>
// 					<div class="fd-ms-dropdown" data-key="${fd.key}" style="display:none"></div>
// 				</div>
// 			</div>`);
// 			$grid.append($f);
// 			this._init_ms($f, fd.key, fd.opts, this.filter_values[fd.key]||[]);
// 		});
// 		const $btns = $(`<div class="fd-bar-btns">
// 			<button class="btn btn-primary btn-sm">&#10003; Apply Filters</button>
// 			<button class="btn btn-default btn-sm fd-clear-btn">Clear All</button>
// 		</div>`);
// 		this.$bar.append($btns);
// 		$btns.find('.btn-primary').on('click', ()=>this.refresh());
// 		$btns.find('.fd-clear-btn').on('click', async ()=>{
// 			this.filter_values={};
// 			await this._load_filter_options(false);
// 			this._render_filter_bar();
// 			this.refresh();
// 		});
// 		$(document).off('click.fd-ms').on('click.fd-ms', (e)=>{
// 			if (!$(e.target).closest('.fd-ms-wrap').length) {
// 				this.$bar.find('.fd-ms-dropdown').hide();
// 				this.$bar.find('.fd-ms-box').removeClass('fd-ms-open');
// 			}
// 		});
// 	}

// 	_init_ms($field, key, opts, selected) {
// 		const $wrap=$field.find(`.fd-ms-wrap[data-key="${key}"]`);
// 		const $box=$wrap.find('.fd-ms-box'), $tags=$wrap.find(`.fd-ms-tags[data-key="${key}"]`);
// 		const $inp=$wrap.find(`.fd-ms-input[data-key="${key}"]`), $dd=$wrap.find(`.fd-ms-dropdown[data-key="${key}"]`);
// 		let sel=new Set(selected);
// 		const rtags=()=>{ $tags.empty(); sel.forEach(v=>{ const $t=$(`<span class="fd-ms-tag">${this._esc(v)}<span class="fd-ms-tag-x">×</span></span>`); $t.find('.fd-ms-tag-x').on('click',(e)=>{ e.stopPropagation(); sel.delete(v); this.filter_values[key]=[...sel]; rtags(); rdd(); this._schedule_cascade(); }); $tags.append($t); }); };
// 		const rdd=(q='')=>{ $dd.empty(); const items=opts.filter(o=>o.toLowerCase().includes(q.toLowerCase())&&!sel.has(o)); if(!items.length){$dd.html('<div class="fd-ms-empty">No options</div>');return;} items.forEach(opt=>{ const $i=$(`<div class="fd-ms-item">${this._esc(opt)}</div>`); $i.on('mousedown',(e)=>{ e.preventDefault(); sel.add(opt); this.filter_values[key]=[...sel]; $inp.val(''); rtags(); rdd(''); this._schedule_cascade(); }); $dd.append($i); }); };
// 		$box.on('click',(e)=>{ if($(e.target).hasClass('fd-ms-tag-x'))return; this.$bar.find('.fd-ms-dropdown').not($dd).hide(); this.$bar.find('.fd-ms-box').not($box).removeClass('fd-ms-open'); $box.addClass('fd-ms-open'); rdd($inp.val()); $dd.show(); $inp.focus(); });
// 		$inp.on('input',()=>rdd($inp.val()));
// 		$inp.on('keydown',(e)=>{ if(e.key==='Backspace'&&!$inp.val()&&sel.size){ const last=[...sel].pop(); sel.delete(last); this.filter_values[key]=[...sel]; rtags(); rdd(); this._schedule_cascade(); } if(e.key==='Escape'){$dd.hide();$box.removeClass('fd-ms-open');} });
// 		rtags();
// 	}

// 	_schedule_cascade() {
// 		clearTimeout(this._cascade_timer);
// 		this._cascade_timer=setTimeout(async()=>{ const saved={...this.filter_values}; await this._load_filter_options(true); const fo=this.filter_options; const no={year:fo.financial_years||[],partner:(fo.partners||[]).map(p=>p.name),grant:fo.grants||[],state:fo.states||[],district:fo.districts||[],block:fo.blocks||[],month:fo.months||[],quarter:fo.quarters||[]}; Object.keys(no).forEach(k=>{ const v=new Set(no[k]); this.filter_values[k]=(saved[k]||[]).filter(x=>v.has(x)); }); this._render_filter_bar(); },500);
// 	}
// 	_filters_for_cascade() {
// 		const g=k=>this.filter_values[k]||[];
// 		return { financial_year:g('year').join(','), partner_id:g('partner').map(n=>this.partner_name_to_id[n]).filter(Boolean).join(','), grant_id:g('grant').join(','), state:g('state').join(','), district:g('district').join(','), block:g('block').join(',') };
// 	}
// 	_active_filters() {
// 		const g=k=>this.filter_values[k]||[];
// 		return { financial_year:g('year').join(','), partner_id:g('partner').map(n=>this.partner_name_to_id[n]).filter(Boolean).join(','), grant_id:g('grant').join(','), state:g('state').join(','), district:g('district').join(','), block:g('block').join(','), month:g('month').join(','), quarter:g('quarter').join(',') };
// 	}

// 	// ─── Refresh ───────────────────────────────────────────────────────────────
// 	async refresh() {
// 		this._set_loading(true);
// 		try {
// 			const r=await frappe.call({method:'creche_reports.api.dashboard.get_dashboard_summary',args:this._active_filters()});
// 			this.summary_data=r.message||{};
// 			this._render_cards(this.summary_data);
// 			this._render_summary_bar(this.summary_data);
// 		} finally { this._set_loading(false); }
// 	}

// 	// ─── Summary bar ───────────────────────────────────────────────────────────
// 	_render_summary_bar(s) {
// 		if (!s||!Object.keys(s).length) { this.$summary.empty(); return; }
// 		this.$summary.html(`<div class="fd-sum-bar">
// 			<div class="fd-sum-item"><span class="fd-sum-label">Partners</span><span class="fd-sum-val">${s.total_partners||0}</span></div>
// 			<div class="fd-sum-div"></div>
// 			<div class="fd-sum-item"><span class="fd-sum-label">Total Budget</span><span class="fd-sum-val">${this._fmt_inr(s.total_budget,true)}</span></div>
// 			<div class="fd-sum-div"></div>
// 			<div class="fd-sum-item"><span class="fd-sum-label">Utilised</span><span class="fd-sum-val">${this._fmt_inr(s.total_utilisation,true)}</span><span class="fd-sum-pct">${this._pct(s.total_utilisation,s.total_budget)}</span></div>
// 			<div class="fd-sum-div"></div>
// 			<div class="fd-sum-item"><span class="fd-sum-label">Disbursed</span><span class="fd-sum-val">${this._fmt_inr(s.total_disbursed,true)}</span><span class="fd-sum-pct">${this._pct(s.total_disbursed,s.total_budget)}</span></div>
// 			<div class="fd-sum-div"></div>
// 			<div class="fd-sum-item"><span class="fd-sum-label">Balance</span><span class="fd-sum-val">${this._fmt_inr(s.balance_available,true)}</span></div>
// 			<div class="fd-sum-div"></div>
// 			<div class="fd-sum-item"><span class="fd-sum-label">Bank Balance</span><span class="fd-sum-val">${this._fmt_inr(s.total_balance_bank,true)}</span></div>
// 			<div class="fd-sum-div"></div>
// 			<div class="fd-sum-item"><span class="fd-sum-label">Delinquent</span><span class="fd-sum-val" style="color:#E74C3C">${s.delinquent_partners||0}</span></div>
// 		</div>`);
// 	}

// 	// ─── Cards ─────────────────────────────────────────────────────────────────
// 	_render_cards(s) {
// 		const primary=[
// 			{key:'budget',      hex:'#2490EF',label:'Total Budget',    value:s.total_budget,      sub:`${s.total_partners||0} partner${s.total_partners===1?'':'s'}`,compact:true,pl:'Budget Breakdown',       icon:this._icon_budget()},
// 			{key:'utilisation', hex:'#28A745',label:'Utilisation',     value:s.total_utilisation, sub:this._pct(s.total_utilisation,s.total_budget)+' of budget',    compact:true,pl:'Utilisation Breakdown',  icon:this._icon_utilisation()},
// 			{key:'disbursed',   hex:'#E67E22',label:'Disbursed',       value:s.total_disbursed,   sub:this._pct(s.total_disbursed,s.total_budget)+' of budget',      compact:true,pl:'Disbursement Breakdown', icon:this._icon_disbursed()},
// 		];
// 		const info=[
// 			{key:'balance',    hex:'#8E44AD',label:'Balance Available',   value:s.balance_available,   sub:'Budget − Utilised',                    compact:true, icon:this._icon_balance()},
// 			{key:'delinquent', hex:'#E74C3C',label:'Delinquent Partners', value:s.delinquent_partners, sub:'Missing 100% utilisation declaration', is_count:true,icon:this._icon_warning()},
// 			{key:'bank',       hex:'#1ABC9C',label:'Balance as per Bank', value:s.total_balance_bank,  sub:'Bank + Cash at end of reported month', compact:true, icon:this._icon_bank()},
// 		];
// 		this.$cards.empty();
// 		const $p=$('<div class="fd-cards-row fd-cards-primary"></div>');
// 		primary.forEach(c=>{
// 			const $card=$(`<div class="fd-card fd-card-popup" style="--card-color:${c.hex}">
// 				<div class="fd-card-inner">
// 					<div class="fd-card-top">
// 						<div class="fd-card-icon-wrap" style="background:${c.hex}18;color:${c.hex}">${c.icon}</div>
// 						<div class="fd-card-open-btn" style="color:${c.hex};border-color:${c.hex}30;background:${c.hex}0d">View Breakdown ↗</div>
// 					</div>
// 					<div class="fd-card-value" style="color:${c.hex}">${this._fmt_inr(c.value,c.compact)}</div>
// 					<div class="fd-card-label">${c.label}</div>
// 					<div class="fd-card-sub">${c.sub}</div>
// 				</div>
// 				<div class="fd-card-bar" style="background:${c.hex}"></div>
// 			</div>`);
// 			$card.on('click',()=>this._open_modal(c.key,c.pl,c.hex));
// 			$p.append($card);
// 		});
// 		const $i=$('<div class="fd-cards-row fd-cards-info"></div>');
// 		info.forEach(c=>{
// 			const display=c.is_count?(c.value||0):this._fmt_inr(c.value,c.compact);
// 			$i.append(`<div class="fd-card fd-card-info" style="--card-color:${c.hex}">
// 				<div class="fd-card-inner">
// 					<div class="fd-card-top"><div class="fd-card-icon-wrap fd-card-icon-sm" style="background:${c.hex}18;color:${c.hex}">${c.icon}</div></div>
// 					<div class="fd-card-value fd-card-value-sm">${display}</div>
// 					<div class="fd-card-label">${c.label}</div>
// 					<div class="fd-card-sub">${c.sub}</div>
// 				</div>
// 				<div class="fd-card-bar" style="background:${c.hex}"></div>
// 			</div>`);
// 		});
// 		this.$cards.append($p).append($i);
// 	}

// 	// ─── Open modal ────────────────────────────────────────────────────────────
// 	async _open_modal(card_key, title, hex) {
// 		$('#fd-modal-title').text(title).css('color', hex);
// 		$('#fd-modal-subtitle').text('Loading data…');
// 		$('#fd-modal-roadmap').empty();
// 		$('#fd-modal-nav').empty();
// 		$('#fd-modal-body').html(`<div class="fd-modal-loading"><div class="fd-spinner"></div><p>Loading breakdown…</p></div>`);
// 		$('#fd-modal-overlay').addClass('open');

// 		try {
// 			const pR = await frappe.call({method:'creche_reports.api.dashboard.get_partner_breakdown',args:this._active_filters()});
// 			const partners = pR.message||[];
// 			const bResults = await Promise.all(partners.map(p=>
// 				frappe.call({method:'creche_reports.api.dashboard.get_budget_breakdown',args:{...this._active_filters(),partner_id:p.partner_id}})
// 			));
// 			const allBudgets=[];
// 			bResults.forEach((br,pi)=>(br.message||[]).forEach(b=>allBudgets.push({...b,_pi:pi})));
// 			const af=this._active_filters();
// 			const eResults=await Promise.all(allBudgets.map(b=>
// 				frappe.call({method:'creche_reports.api.dashboard.get_budget_expense_breakdown',
// 					args:{budget_reference_id:b.budget_reference_id,month:af.month||'',quarter:af.quarter||''}})
// 			));
// 			this._render_modal(card_key,title,hex,partners,allBudgets,eResults);
// 		} catch(err) {
// 			$('#fd-modal-body').html(`<div class="fd-modal-error">⚠️ Failed to load data. Please try again.</div>`);
// 			console.error(err);
// 		}
// 	}

// 	// ─── Render modal ──────────────────────────────────────────────────────────
// 	_render_modal(card_key, title, hex, partners, allBudgets, eResults) {
// 		const cfg={
// 			budget:      {pk:'total_budget',      ek:'total_budget',   el:'Budget'},
// 			utilisation: {pk:'total_utilisation',  ek:'total_utilised', el:'Utilised'},
// 			disbursed:   {pk:'total_disbursed',    ek:'total_disbursed',el:'Disbursed'},
// 		}[card_key]||{pk:'total_budget',ek:'total_budget',el:'Budget'};

// 		const COLORS=['#2490EF','#28A745','#E67E22','#8E44AD','#1ABC9C','#E74C3C','#3498DB','#F39C12','#16A085','#D35400'];

// 		// Grand totals across all partners
// 		const grandBud  = partners.reduce((s,p)=>s+(p.total_budget||0),0);
// 		const grandUtil = partners.reduce((s,p)=>s+(p.total_utilisation||0),0);
// 		const grandDisb = partners.reduce((s,p)=>s+(p.total_disbursed||0),0);
// 		const grandBal  = partners.reduce((s,p)=>s+(p.balance_available||0),0);
// 		const grandBank = partners.reduce((s,p)=>s+(p.balance_bank||0),0);
// 		const grandVal  = partners.reduce((s,p)=>s+(p[cfg.pk]||0),0);
// 		const utilPct   = grandBud ? Math.round((grandUtil/grandBud)*100) : 0;
// 		const disbPct   = grandBud ? Math.round((grandDisb/grandBud)*100) : 0;
// 		const utilUc    = utilPct>100?'#dc2626':utilPct>=60?'#d97706':'#15803d';
// 		const disbUc    = disbPct>100?'#dc2626':disbPct>=60?'#d97706':'#15803d';

// 		// Update subtitle
// 		$('#fd-modal-subtitle').html(`<span style="color:${hex};font-weight:700">${this._fmt_inr(grandVal,true)}</span> · ${partners.length} partner${partners.length===1?'':'s'} · ${allBudgets.length} budget${allBudgets.length===1?'':'s'}`);

// 		// ── ROADMAP ──
// 		const $rm=$('#fd-modal-roadmap').empty();
// 		const rmIcons={
// 			dashboard:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>`,
// 			breakdown:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="2,11 6,7 9,9 14,4"/><polyline points="11,4 14,4 14,7"/></svg>`,
// 			partner:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5" r="3"/><path d="M2,14 C2,11 5,9 8,9 C11,9 14,11 14,14"/></svg>`,
// 			budget:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><line x1="5" y1="7" x2="11" y2="7"/><line x1="5" y1="10" x2="9" y2="10"/></svg>`,
// 			expense:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8"/><line x1="8" y1="11" x2="8.01" y2="11"/></svg>`,
// 		};
// 		const steps=[
// 			{key:'dashboard',label:'Dashboard',   active:false,done:true},
// 			{key:'breakdown',label:title,         active:true, done:false},
// 			{key:'partner',  label:'Partner',     active:false,done:false},
// 			{key:'budget',   label:'Budget/Grant',active:false,done:false},
// 			{key:'expense',  label:'Expense Items',active:false,done:false},
// 		];
// 		$rm.append(`<div class="fd-roadmap">${steps.map((s,i)=>`
// 			<div class="fd-roadmap-step${s.active?' active':''}${s.done?' done':''}">
// 				<div class="fd-roadmap-icon-wrap">
// 					<span class="fd-roadmap-icon">${rmIcons[s.key]}</span>
// 					${i<steps.length-1?'<div class="fd-roadmap-line"></div>':''}
// 				</div>
// 				<span class="fd-roadmap-label">${s.label}</span>
// 			</div>`).join('')}
// 		</div>`);

// 		// ── NAV ──
// 		const $nav=$('#fd-modal-nav').empty();
// 		$nav.append(`<div class="fd-modal-nav-title">Partners</div>`);
// 		const $navList=$('<div class="fd-modal-nav-list"></div>');
// 		$navList.append(`<div class="fd-modal-nav-item active" data-nav="all">
// 			<span class="fd-nav-dot" style="background:#1a4f8a"></span>
// 			<span class="fd-nav-label">All Partners</span>
// 			<span class="fd-nav-val">${this._fmt_inr(grandVal,true)}</span>
// 		</div>`);
// 		partners.forEach((p,pi)=>{
// 			const color=COLORS[pi%COLORS.length];
// 			const val=p[cfg.pk]||0;
// 			$navList.append(`<div class="fd-modal-nav-item" data-nav="p${pi}">
// 				<span class="fd-nav-dot" style="background:${color}"></span>
// 				<span class="fd-nav-label">${this._esc(p.partner_name)}</span>
// 				<span class="fd-nav-val">${this._fmt_inr(val,true)}</span>
// 			</div>`);
// 		});
// 		$nav.append($navList);

// 		// ── RENDER VIEW ──
// 		const renderView=(navId)=>{
// 			$navList.find('.fd-modal-nav-item').removeClass('active');
// 			$navList.find(`[data-nav="${navId}"]`).addClass('active');
// 			const isAll=(navId==='all');
// 			const pi=isAll?null:parseInt(navId.replace('p',''));
// 			const partnersToShow=isAll?partners:[partners[pi]];

// 			// Update roadmap
// 			$rm.find('.fd-roadmap-step').removeClass('active done');
// 			steps.forEach((s,i)=>{
// 				const $st=$rm.find('.fd-roadmap-step').eq(i);
// 				if(i===0) $st.addClass('done');
// 				else if(i===1&&isAll)  $st.addClass('active');
// 				else if(i===1&&!isAll) $st.addClass('done');
// 				else if(i===2&&!isAll) $st.addClass('active');
// 			});

// 			// Compute totals for THIS view
// 			const vBud  = partnersToShow.reduce((s,p)=>s+(p.total_budget||0),0);
// 			const vUtil = partnersToShow.reduce((s,p)=>s+(p.total_utilisation||0),0);
// 			const vDisb = partnersToShow.reduce((s,p)=>s+(p.total_disbursed||0),0);
// 			const vBal  = partnersToShow.reduce((s,p)=>s+(p.balance_available||0),0);
// 			const vBank = partnersToShow.reduce((s,p)=>s+(p.balance_bank||0),0);
// 			const vUp   = vBud?Math.round((vUtil/vBud)*100):0;
// 			const vDp   = vBud?Math.round((vDisb/vBud)*100):0;
// 			const vUc   = vUp>100?'#dc2626':vUp>=60?'#d97706':'#15803d';
// 			const vDc   = vDp>100?'#dc2626':vDp>=60?'#d97706':'#15803d';

// 			if(!isAll){
// 				const p=partners[pi];
// 				$('#fd-modal-subtitle').html(`<span style="color:${COLORS[pi%COLORS.length]};font-weight:700">${this._esc(p.partner_name)}</span> · <span style="color:${hex}">${this._fmt_inr(p[cfg.pk]||0,true)}</span>`);
// 			} else {
// 				$('#fd-modal-subtitle').html(`<span style="color:${hex};font-weight:700">${this._fmt_inr(grandVal,true)}</span> · ${partners.length} partner${partners.length===1?'':'s'} · ${allBudgets.length} budget${allBudgets.length===1?'':'s'}`);
// 			}

// 			const $body=$('#fd-modal-body').empty();

// 			// ── SUMMARY NUMBER CARDS ──
// 			const cards=[
// 				{label:'Total Budget',   value:vBud,  sub:`${partnersToShow.length} partner${partnersToShow.length===1?'':'s'}`, color:'#1a4f8a', pct:null},
// 				{label:'Utilised',       value:vUtil, sub:`${vUp}% of budget`,   color:vUc,   pct:vUp},
// 				{label:'Disbursed',      value:vDisb, sub:`${vDp}% of budget`,   color:vDc,   pct:vDp},
// 				{label:'Balance Avail.', value:vBal,  sub:'Budget − Utilised',   color:'#6b21a8', pct:null},
// 				{label:'Bank Balance',   value:vBank, sub:'End of reported month',color:'#0f766e', pct:null},
// 			];
// 			const $cards=$('<div class="fd-sum-cards"></div>');
// 			cards.forEach(c=>{
// 				const bw=c.pct!==null?Math.min(100,Math.max(0,c.pct)):null;
// 				$cards.append(`<div class="fd-sum-card" style="border-top:3px solid ${c.color}">
// 					<div class="fd-sum-card-label">${c.label}</div>
// 					<div class="fd-sum-card-value" style="color:${c.color}">${this._fmt_inr(c.value,true)}</div>
// 					<div class="fd-sum-card-sub">${c.sub}</div>
// 					${bw!==null?`<div class="fd-sum-card-bar-bg"><div class="fd-sum-card-bar" style="width:${bw}%;background:${c.color}"></div></div>`:''}
// 				</div>`);
// 			});
// 			$body.append($cards);

// 			// ── PARTNER BLOCKS ──
// 			partnersToShow.forEach(p=>{
// 				const realPi=partners.indexOf(p);
// 				const color=COLORS[realPi%COLORS.length];
// 				const pBudgets=allBudgets.filter(b=>b._pi===realPi);

// 				if(isAll&&partners.length>1){
// 					$body.append(`<div class="fd-modal-partner-hdr" style="border-left-color:${color}">
// 						<span class="fd-nav-dot" style="background:${color}"></span>
// 						<strong style="color:${color}">${this._esc(p.partner_name)}</strong>
// 						<span class="fd-modal-hdr-meta">${this._esc(p.states||'')} · ${pBudgets.length} budget${pBudgets.length===1?'':'s'}</span>
// 					</div>`);
// 				}

// 				pBudgets.forEach((b,bi)=>{
// 					const globalIdx=allBudgets.indexOf(b);
// 					const exp_data=eResults[globalIdx]?.message||{};
// 					const expenses=exp_data.expense_breakdown||[];
// 					const months=exp_data.monthly_summary||[];
// 					const bVal=b[cfg.pk]||0;
// 					const bBud=b.total_budget||0;
// 					const bUtil=b.total_utilisation||0;
// 					const bDisb=b.total_disbursed||0;
// 					const bBal=b.balance_available||0;
// 					const bPct=bBud?Math.round((bUtil/bBud)*100):0;
// 					const bUc=bPct>100?'#dc2626':bPct>=60?'#d97706':'#15803d';
// 					const uid=`${realPi}_${bi}`;

// 					$body.append(`<div class="fd-modal-budget-hdr" data-uid="${uid}">
// 						<div class="fd-modal-budget-hdr-left">
// 							<span class="fd-bud-caret" id="caret_${uid}">▶</span>
// 							<span class="fd-modal-grant" style="color:${color}">${this._esc(b.grant_id||'—')}</span>
// 							${b.budget_reference_name?`<span class="fd-modal-ref">${this._esc(b.budget_reference_name)}</span>`:''}
// 							<span class="fd-modal-chips">
// 								${b.financial_year?`<span class="fd-chip">${this._esc(b.financial_year)}</span>`:''}
// 								${b.state?`<span class="fd-chip">${this._esc(b.state)}</span>`:''}
// 								${b.district?`<span class="fd-chip">${this._esc(b.district)}</span>`:''}
// 							</span>
// 						</div>
// 						<div class="fd-modal-budget-hdr-right">
// 							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Budget</span><span class="fd-modal-kpi-v">${this._fmt_inr(bBud,true)}</span></span>
// 							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Utilised</span><span class="fd-modal-kpi-v" style="color:${bUc}">${this._fmt_inr(bUtil,true)}</span></span>
// 							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Disbursed</span><span class="fd-modal-kpi-v">${this._fmt_inr(bDisb,true)}</span></span>
// 							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Balance</span><span class="fd-modal-kpi-v ${bBal<0?'fdt-neg':''}">${this._fmt_inr(bBal,true)}</span></span>
// 							<span class="fd-util-badge" style="background:${bUc}18;color:${bUc};border:1px solid ${bUc}30">${bPct}%</span>
// 						</div>
// 					</div>`);

// 					const $content=$(`<div class="fd-modal-budget-content" id="bcon_${uid}" style="display:none"></div>`);

// 					// ── TABLE 1: Expense Line Items ──
// 					if(expenses.length){
// 						const eTotBud=expenses.reduce((s,e)=>s+(e.total_budget||0),0);
// 						const eTotVal=expenses.reduce((s,e)=>s+(e[cfg.ek]||0),0);
// 						const eTotUti=expenses.reduce((s,e)=>s+(e.total_utilised||0),0);
// 						const eTotBal=expenses.reduce((s,e)=>s+(e.balance||0),0);
// 						const eTotY1=expenses.reduce((s,e)=>s+(e.year_1||0),0);
// 						const eTotY2=expenses.reduce((s,e)=>s+(e.year_2||0),0);
// 						const eTotY3=expenses.reduce((s,e)=>s+(e.year_3||0),0);
// 						const eTotCYB=expenses.reduce((s,e)=>s+(e.current_year_budget||0),0);
// 						const eTotMB=expenses.reduce((s,e)=>s+(e.monthly_budget||0),0);
// 						const eTotBTD=expenses.reduce((s,e)=>s+(e.budget_to_date||0),0);

// 						const exp_rows=expenses.map((e,ei)=>{
// 							const ev=e[cfg.ek]||0, eb=e.total_budget||0, ebal=e.balance||0;
// 							const pct=e.pct_utilised||0, bw=Math.min(100,Math.max(0,pct));
// 							const ec=pct>100?'#dc2626':pct>85?'#d97706':'#15803d';
// 							return `<tr>
// 								<td class="fdt-num">${ei+1}</td>
// 								<td class="fdt-main fdt-type" style="border-left:3px solid ${color}">${this._esc(e.type_of_expenses||'—')}</td>
// 								<td class="fdt-muted fdt-head">${this._esc(e.budget_main_head||'—')}</td>
// 								<td class="fdt-muted fdt-head">${this._esc(e.budget_sub_head||'—')}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.year_1)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.year_2)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.year_3)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eb)}</strong></td>
// 								<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.current_year_budget)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.monthly_budget)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col fdt-hl">${this._fmt_inr(e.budget_to_date)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col fdt-hl" style="color:${hex}"><strong>${this._fmt_inr(ev)}</strong></td>
// 								<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(e.total_utilised)}</strong></td>
// 								<td class="fdt-r fdt-curr fdt-num-col ${ebal<0?'fdt-neg':''}">${this._fmt_inr(ebal)}</td>
// 								<td class="fdt-r fdt-num-col">
// 									<div class="fdt-pct-wrap">
// 										<div class="fdt-pct-bar" style="width:${bw}%;background:${ec}"></div>
// 										<span style="font-size:10px;font-weight:700;color:${ec}">${pct}%</span>
// 									</div>
// 								</td>
// 							</tr>`;
// 						}).join('');

// 						$content.append(`
// 							<div class="fd-tbl-label">Expense Line Items <span class="fd-chip">${expenses.length}</span></div>
// 							<div class="fd-tbl-scroll">
// 								<table class="fd-tbl">
// 									<thead>
// 										<tr>
// 											<th class="fdt-num" rowspan="2">#</th>
// 											<th class="fdt-type" rowspan="2">Expense Type</th>
// 											<th class="fdt-head" rowspan="2">Main Head</th>
// 											<th class="fdt-head" rowspan="2">Sub Head</th>
// 											<th class="fdt-r fdt-num-col" colspan="3" style="text-align:center;border-bottom:1px solid rgba(255,255,255,.15)">Yearly Budget</th>
// 											<th class="fdt-r fdt-num-col fdt-hl" rowspan="2">Total Budget</th>
// 											<th class="fdt-r fdt-num-col" rowspan="2">Cur. Year</th>
// 											<th class="fdt-r fdt-num-col" rowspan="2">Monthly</th>
// 											<th class="fdt-r fdt-num-col fdt-hl" rowspan="2">To Date</th>
// 											<th class="fdt-r fdt-num-col fdt-hl" rowspan="2" style="background:${hex}33">${cfg.el}</th>
// 											<th class="fdt-r fdt-num-col fdt-hl" rowspan="2">Utilised</th>
// 											<th class="fdt-r fdt-num-col" rowspan="2">Balance</th>
// 											<th class="fdt-r fdt-num-col" rowspan="2">% Util</th>
// 										</tr>
// 										<tr>
// 											<th class="fdt-r fdt-num-col">Y1</th>
// 											<th class="fdt-r fdt-num-col">Y2</th>
// 											<th class="fdt-r fdt-num-col">Y3</th>
// 										</tr>
// 									</thead>
// 									<tbody>${exp_rows}</tbody>
// 									<tfoot><tr class="fdt-foot">
// 										<td></td><td><strong>Total</strong></td><td></td><td></td>
// 										<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotY1)}</td>
// 										<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotY2)}</td>
// 										<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotY3)}</td>
// 										<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eTotBud)}</strong></td>
// 										<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotCYB)}</td>
// 										<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotMB)}</td>
// 										<td class="fdt-r fdt-curr fdt-num-col fdt-hl">${this._fmt_inr(eTotBTD)}</td>
// 										<td class="fdt-r fdt-curr fdt-num-col fdt-hl" style="color:${hex}"><strong>${this._fmt_inr(eTotVal)}</strong></td>
// 										<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eTotUti)}</strong></td>
// 										<td class="fdt-r fdt-curr fdt-num-col ${eTotBal<0?'fdt-neg':''}"><strong>${this._fmt_inr(eTotBal)}</strong></td>
// 										<td></td>
// 									</tr></tfoot>
// 								</table>
// 							</div>`);
// 					}

// 					// ── TABLE 2: Monthly Breakdown ──
// 					if(months.length){
// 						const moTotBud=months.reduce((s,m)=>s+(m.monthly_budget||0),0);
// 						const moTotUti=months.reduce((s,m)=>s+(m.total_utilised||0),0);
// 						const moTotBal=months.reduce((s,m)=>s+(m.balance||0),0);

// 						const mo_rows=months.map((m,mi)=>{
// 							const pct=m.pct_utilised||0, bw=Math.min(100,Math.max(0,pct));
// 							const mc=pct>100?'#dc2626':pct>85?'#d97706':'#15803d';
// 							const neg=(m.balance||0)<0;
// 							const decl=m.declaration
// 								?`<span class="fd-pill-yes">✓ Declared</span>`
// 								:`<span class="fd-pill-no">Pending</span>`;
// 							const muid=`m_${uid}_${mi}`;
// 							const has_items=m.items&&m.items.length;

// 							const sub_rows=(m.items||[]).map(it=>{
// 								const itv = it[cfg.ek] || it.utilised || it.total_utilised || 0;
// 								const itb = it.monthly_budget || 0;
// 								const itbal = it.balance || 0;
// 								const itn = itbal < 0;
// 								const itPct = itb ? Math.min(999, Math.round((itv/itb)*100)) : 0;
// 								const itUc  = itPct>100?'#dc2626':itPct>=60?'#d97706':'#15803d';
// 								return `<tr class="fdt-mo-sub fd-mo-sub-${muid}" style="display:none;background:#f0f5fb">
// 									<td class="fdt-num" style="color:#c0c8d4">—</td>
// 									<td style="padding-left:22px;color:#374151;font-size:11px;font-weight:500">${this._esc(it.type_of_expenses||'—')}</td>
// 									<td class="fdt-muted" style="font-size:11px">${this._esc(it.budget_main_head||'—')}</td>
// 									<td class="fdt-r fdt-curr fdt-num-col" style="font-size:11px">${this._fmt_inr(itb)}</td>
// 									<td class="fdt-r fdt-curr fdt-num-col" style="font-size:11px;color:${itUc}">${this._fmt_inr(itv)}</td>
// 									<td class="fdt-r fdt-curr fdt-num-col ${itn?'fdt-neg':''}" style="font-size:11px">${this._fmt_inr(itbal)}</td>
// 									<td class="fdt-r fdt-curr fdt-num-col fdt-muted" style="font-size:11px">${this._fmt_inr(it.balance_amount||0)}</td>
// 									<td class="fdt-r fdt-num-col">
// 										<div class="fdt-pct-wrap">
// 											<div class="fdt-pct-bar" style="width:${Math.min(100,itPct)}%;background:${itUc}"></div>
// 											<span style="font-size:9px;font-weight:700;color:${itUc}">${itPct}%</span>
// 										</div>
// 									</td>
// 									<td></td>
// 									<td></td>
// 								</tr>`;
// 							}).join('');

// 							return `<tr class="fdt-mo-row">
// 								<td class="fdt-num">${mi+1}</td>
// 								<td class="fdt-main"><strong>${this._esc(m.month||'—')}</strong></td>
// 								<td class="fdt-muted">${this._esc(m.financial_year||'—')}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(m.monthly_budget)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col" style="color:${mc}"><strong>${this._fmt_inr(m.total_utilised)}</strong></td>
// 								<td class="fdt-r fdt-curr fdt-num-col ${neg?'fdt-neg':''}">${this._fmt_inr(m.balance)}</td>
// 								<td class="fdt-r fdt-curr fdt-num-col fdt-muted">${this._fmt_inr(m.balance_amount)}</td>
// 								<td class="fdt-r fdt-num-col">
// 									<div class="fdt-pct-wrap">
// 										<div class="fdt-pct-bar" style="width:${bw}%;background:${mc}"></div>
// 										<span style="font-size:10px;font-weight:700;color:${mc}">${pct}%</span>
// 									</div>
// 								</td>
// 								<td class="fdt-center">${decl}</td>
// 								<td class="fdt-center fdt-mo-btn" data-uid="${muid}" style="cursor:pointer;color:${color};font-weight:700;width:30px">${has_items?'▶':''}</td>
// 							</tr>${sub_rows}`;
// 						}).join('');

// 						$content.append(`
// 							<div class="fd-tbl-label" style="margin-top:14px">Monthly Breakdown <span class="fd-chip">${months.length} months</span></div>
// 							<div class="fd-tbl-scroll">
// 								<table class="fd-tbl">
// 									<thead>
// 										<tr>
// 											<th class="fdt-num">#</th>
// 											<th class="fdt-type">Month</th>
// 											<th class="fdt-head">FY</th>
// 											<th class="fdt-r fdt-num-col">Monthly Bud.</th>
// 											<th class="fdt-r fdt-num-col" style="background:${hex}33">Actual Utilised</th>
// 											<th class="fdt-r fdt-num-col">Variance</th>
// 											<th class="fdt-r fdt-num-col">Bank Bal.</th>
// 											<th class="fdt-r fdt-num-col">% Util</th>
// 											<th class="fdt-center" style="min-width:90px">Declaration</th>
// 											<th style="width:30px"></th>
// 										</tr>
// 									</thead>
// 									<tbody>${mo_rows}</tbody>
// 									<tfoot><tr class="fdt-foot">
// 										<td></td><td><strong>Total (${months.length} mo.)</strong></td><td></td>
// 										<td class="fdt-r fdt-curr fdt-num-col"><strong>${this._fmt_inr(moTotBud)}</strong></td>
// 										<td class="fdt-r fdt-curr fdt-num-col"><strong>${this._fmt_inr(moTotUti)}</strong></td>
// 										<td class="fdt-r fdt-curr fdt-num-col ${moTotBal<0?'fdt-neg':''}"><strong>${this._fmt_inr(moTotBal)}</strong></td>
// 										<td></td><td></td><td></td><td></td>
// 									</tr></tfoot>
// 								</table>
// 							</div>`);

// 					}  // end if months.length

// 					if(!expenses.length&&!months.length){
// 						$content.html('<div style="padding:16px;text-align:center;color:#9aa3b0;font-size:12px">No expense data for this budget.</div>');
// 					}

// 					$body.append($content);

// 					// Monthly toggle — bound after content is in DOM
// 					$body.on(`click.mo_${uid}`, '.fdt-mo-btn', (e) => {
// 						const muid = $(e.currentTarget).data('uid');
// 						if (!$content.find(`.fd-mo-sub-${muid}`).length) return;
// 						const $sub = $content.find(`.fd-mo-sub-${muid}`);
// 						const open = $sub.first().is(':visible');
// 						$sub.toggle(!open);
// 						$(e.currentTarget).text(open ? '▶' : '▼');
// 					});

// 					// Budget toggle
// 					$body.find(`.fd-modal-budget-hdr[data-uid="${uid}"]`).on('click',function(){
// 						const $c=$(`#bcon_${uid}`);
// 						const open=$c.is(':visible');
// 						$c.slideToggle(180);
// 						$(`#caret_${uid}`).text(open?'▶':'▼');
// 					});
// 				});
// 			});
// 		};

// 		$navList.on('click','.fd-modal-nav-item',(e)=>renderView($(e.currentTarget).data('nav')));
// 		renderView('all');
// 	}

// 	// ─── Icons ─────────────────────────────────────────────────────────────────
// 	_icon_budget()      { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`; }
// 	_icon_utilisation() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`; }
// 	_icon_disbursed()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>`; }
// 	_icon_balance()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>`; }
// 	_icon_warning()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`; }
// 	_icon_bank()        { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`; }

// 	// ─── Utilities ─────────────────────────────────────────────────────────────
// 	_fmt_inr(amount,compact=false){const n=parseFloat(amount)||0,abs=Math.abs(n),sign=n<0?'-':'';if(compact){if(abs>=1e7)return sign+'₹'+(abs/1e7).toFixed(2)+' Cr';if(abs>=1e5)return sign+'₹'+(abs/1e5).toFixed(2)+' L';if(abs>=1e3)return sign+'₹'+(abs/1e3).toFixed(1)+' K';}return sign+'₹'+abs.toLocaleString('en-IN',{maximumFractionDigits:2});}
// 	_pct(num,den){if(!den)return'0%';return(((num||0)/den)*100).toFixed(1)+'%';}
// 	_esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// 	_set_loading(on){this.$el&&(on?this.$el.addClass('fd-loading'):this.$el.removeClass('fd-loading'));}

// 	// ─── CSS ───────────────────────────────────────────────────────────────────
// 	_styles(){return`<style>
// /* Base */
// .fd-wrap*{box-sizing:border-box}
// .fd-wrap{font-family:var(--font-stack);color:var(--text-color);padding:20px 24px}
// .fd-wrap.fd-loading{opacity:.5;pointer-events:none}

// /* Filter */
// .fd-filter-bar{background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);padding:16px 20px 14px;margin-bottom:24px}
// .fd-filter-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 14px;margin-bottom:14px}
// @media(max-width:1100px){.fd-filter-grid{grid-template-columns:repeat(3,1fr)}}
// @media(max-width:760px){.fd-filter-grid{grid-template-columns:repeat(2,1fr)}}
// .fd-filter-label{display:block;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
// .fd-bar-btns{display:flex;gap:8px}
// .fd-ms-wrap{position:relative}
// .fd-ms-box{display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-height:32px;padding:3px 8px;background:var(--control-bg,#fff);border:1px solid var(--border-color);border-radius:var(--border-radius);cursor:text;transition:border-color .15s,box-shadow .15s}
// .fd-ms-box.fd-ms-open,.fd-ms-box:focus-within{border-color:var(--primary-color,#2490EF);box-shadow:0 0 0 2px rgba(36,144,239,.14)}
// .fd-ms-tags{display:contents}
// .fd-ms-tag{display:inline-flex;align-items:center;gap:4px;background:var(--primary-color,#2490EF);color:#fff;font-size:11px;font-weight:600;padding:2px 6px 2px 8px;border-radius:3px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
// .fd-ms-tag-x{cursor:pointer;font-size:14px;opacity:.8;flex-shrink:0}
// .fd-ms-tag-x:hover{opacity:1}
// .fd-ms-input{border:none;outline:none;background:transparent;font-size:13px;color:var(--text-color);flex:1;min-width:50px;padding:2px 0;font-family:var(--font-stack)}
// .fd-ms-input::placeholder{color:var(--text-muted)}
// .fd-ms-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--card-bg,#fff);border:1px solid var(--border-color);border-radius:var(--border-radius);box-shadow:0 4px 20px rgba(0,0,0,.12);z-index:1000;max-height:220px;overflow-y:auto}
// .fd-ms-item{padding:7px 12px;font-size:13px;cursor:pointer;transition:background .1s}
// .fd-ms-item:hover{background:var(--primary-color,#2490EF);color:#fff}
// .fd-ms-empty{padding:10px 12px;font-size:12px;color:var(--text-muted);text-align:center}

// /* Cards */
// .fd-cards-row{display:grid;gap:16px;margin-bottom:16px}
// .fd-cards-primary{grid-template-columns:repeat(3,1fr)}
// .fd-cards-info{grid-template-columns:repeat(3,1fr)}
// @media(max-width:760px){.fd-cards-primary,.fd-cards-info{grid-template-columns:1fr}}
// .fd-card{background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);overflow:hidden;transition:box-shadow .18s,transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.05)}
// .fd-card-popup{cursor:pointer}
// .fd-card-popup:hover{box-shadow:0 6px 24px rgba(0,0,0,.11);transform:translateY(-2px)}
// .fd-card-info{cursor:default;opacity:.9}
// .fd-card-bar{height:3px;width:100%}
// .fd-card-inner{padding:18px 18px 14px}
// .fd-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:8px}
// .fd-card-icon-wrap{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
// .fd-card-icon-wrap svg{width:20px;height:20px}
// .fd-card-icon-sm{width:32px;height:32px;border-radius:8px}
// .fd-card-icon-sm svg{width:16px;height:16px}
// .fd-card-open-btn{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
// .fd-card-value{font-size:28px;font-weight:800;line-height:1.1;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
// .fd-card-value-sm{font-size:22px;color:var(--text-color)!important}
// .fd-card-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px}
// .fd-card-sub{font-size:11px;color:var(--text-muted)}

// /* Summary bar */
// .fd-sum-bar{display:flex;align-items:center;flex-wrap:wrap;background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);padding:12px 24px;gap:0;margin-bottom:8px}
// .fd-sum-item{display:flex;flex-direction:column;align-items:center;padding:4px 18px;gap:2px}
// .fd-sum-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted)}
// .fd-sum-val{font-size:15px;font-weight:800;color:var(--text-color)}
// .fd-sum-pct{font-size:10px;color:var(--text-muted)}
// .fd-sum-div{width:1px;height:32px;background:var(--border-color);flex-shrink:0}

// /* ══ MODAL ══ */
// #fd-modal-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9000;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
// #fd-modal-overlay.open{display:flex}
// #fd-modal{background:#fff;width:min(1200px,100%);height:min(88vh,900px);border-radius:14px;overflow:hidden;display:flex;box-shadow:0 32px 100px rgba(0,0,0,.22);animation:fd-modal-in .28s cubic-bezier(.22,.68,0,1.15)}
// @keyframes fd-modal-in{from{transform:scale(.95) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}

// /* Left sidebar — clean light */
// #fd-modal-sidebar{width:220px;min-width:220px;background:#f8f9fb;border-right:1px solid #e4e8ef;display:flex;flex-direction:column;overflow:hidden}

// /* Roadmap */
// #fd-modal-roadmap{padding:18px 14px 14px;border-bottom:1px solid #e4e8ef}
// .fd-roadmap{display:flex;flex-direction:column;gap:0}
// .fd-roadmap-step{display:flex;align-items:flex-start;gap:10px;opacity:.38;transition:opacity .2s}
// .fd-roadmap-step.active{opacity:1}
// .fd-roadmap-step.done{opacity:.6}
// .fd-roadmap-icon-wrap{display:flex;flex-direction:column;align-items:center;flex-shrink:0}
// .fd-roadmap-icon{width:26px;height:26px;border-radius:7px;background:#eef0f3;color:#8892a4;display:flex;align-items:center;justify-content:center;flex-shrink:0}
// .fd-roadmap-icon svg{width:13px;height:13px}
// .fd-roadmap-step.active .fd-roadmap-icon{background:#1a4f8a;color:#fff}
// .fd-roadmap-step.done .fd-roadmap-icon{background:#e8f5e9;color:#2e7d32}
// .fd-roadmap-step.done .fd-roadmap-icon svg{stroke:#2e7d32}
// .fd-roadmap-line{width:2px;height:18px;background:#e0e4ea;margin:3px auto}
// .fd-roadmap-step.active .fd-roadmap-line{background:#c5d4e8}
// .fd-roadmap-label{font-size:11px;font-weight:600;color:#596270;padding-top:5px;line-height:1.3}
// .fd-roadmap-step.active .fd-roadmap-label{color:#1a2e4a;font-weight:700}
// .fd-roadmap-step.done .fd-roadmap-label{color:#4a7c59}

// /* Nav */
// #fd-modal-nav{flex:1;overflow-y:auto;padding:10px 0}
// #fd-modal-nav::-webkit-scrollbar{width:4px}
// #fd-modal-nav::-webkit-scrollbar-thumb{background:#dde1e7;border-radius:2px}
// .fd-modal-nav-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9aa3b0;padding:0 14px 8px}
// .fd-modal-nav-item{display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;transition:background .12s;border-radius:0}
// .fd-modal-nav-item:hover{background:#eef0f5}
// .fd-modal-nav-item.active{background:#e8eef7}
// .fd-nav-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
// .fd-nav-label{font-size:12px;font-weight:500;color:#596270;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
// .fd-modal-nav-item.active .fd-nav-label{color:#1a2e4a;font-weight:700}
// .fd-nav-val{font-size:10px;font-weight:700;color:#9aa3b0;flex-shrink:0}
// .fd-modal-nav-item.active .fd-nav-val{color:#1a4f8a}

// /* Right main */
// #fd-modal-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
// #fd-modal-main-header{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid #e8edf3;flex-shrink:0;background:#fff}
// #fd-modal-title{font-size:17px;font-weight:800;line-height:1.2;margin-bottom:3px;color:#1a2e4a}
// #fd-modal-subtitle{font-size:12px;color:#8892a4}
// #fd-modal-close{background:#f1f3f6;border:none;cursor:pointer;width:30px;height:30px;border-radius:7px;font-size:16px;color:#596270;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;flex-shrink:0;margin-top:2px;font-weight:700}
// #fd-modal-close:hover{background:#e0e4ea;color:#1a2e4a}
// #fd-modal-body{flex:1;overflow-y:auto;padding:14px 20px 20px;background:#f7f8fa}
// #fd-modal-body::-webkit-scrollbar{width:5px}
// #fd-modal-body::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:3px}

// /* Budget block */
// .fd-modal-partner-hdr{display:flex;align-items:center;gap:8px;padding:7px 12px;border-left:3px solid;background:#fff;border-radius:7px;margin-bottom:6px;font-size:12px;border:1px solid #e8edf3;border-left-width:3px}
// .fd-modal-hdr-meta{font-size:11px;color:#9aa3b0;margin-left:4px}
// .fd-modal-budget-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border:1px solid #e8edf3;border-radius:9px;margin-bottom:4px;gap:12px;flex-wrap:wrap;transition:background .12s,box-shadow .15s;cursor:pointer}
// .fd-modal-budget-hdr:hover{background:#f4f6fb;box-shadow:0 1px 6px rgba(0,0,0,.06)}
// .fd-modal-budget-hdr-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;flex:1}
// .fd-modal-budget-hdr-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex-shrink:0}
// .fd-modal-grant{font-size:13px;font-weight:700;color:#1a2e4a}
// .fd-modal-ref{font-size:11px;color:#9aa3b0}
// .fd-modal-chips{display:flex;gap:4px;flex-wrap:wrap}
// .fd-modal-kpi{display:flex;flex-direction:column;align-items:flex-end;gap:1px}
// .fd-modal-kpi-l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9aa3b0}
// .fd-modal-kpi-v{font-size:13px;font-weight:700;color:#1a2e4a}
// .fd-util-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:6px;white-space:nowrap}
// .fd-bud-caret{font-size:10px;color:#9aa3b0;margin-right:4px;transition:transform .18s;display:inline-block;flex-shrink:0}
// .fd-modal-budget-content{padding:2px 0 14px 0}

// /* Tables */
// .fd-tbl-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8892a4;margin-bottom:7px;display:flex;align-items:center;gap:6px}
// .fd-tbl-scroll{overflow-x:auto;border:1px solid #d9dee6;border-radius:8px;margin-bottom:4px}
// .fd-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;min-width:700px}
// .fd-tbl thead tr{background:#1a4f8a}
// .fd-tbl thead th{padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;border-right:1px solid rgba(255,255,255,.12);position:sticky;top:0;z-index:2}
// .fd-tbl thead th:last-child{border-right:none}
// .fd-tbl tbody tr{background:#fff;transition:background .1s}
// .fd-tbl tbody tr:nth-child(even):not(.fdt-mo-sub){background:#f7f9fc}
// .fd-tbl tbody tr:hover:not(.fdt-mo-sub){background:#eef3fb!important}
// .fd-tbl tbody td{padding:8px 10px;color:#374151;border-right:1px solid #e8edf3;border-bottom:1px solid #e8edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
// .fd-tbl tbody tr:last-child td{border-bottom:none}
// .fd-tbl tbody td:last-child{border-right:none}
// .fd-tbl tfoot tr{background:#eef2f8}
// .fdt-foot td{padding:8px 10px;border-right:1px solid #d9dee6;border-top:2px solid #c8d0db;font-size:12px;white-space:nowrap;color:#1a2e4a}
// .fdt-foot td:last-child{border-right:none}
// .fdt-num{text-align:center!important;width:36px;font-weight:600;font-size:10px;color:#9aa3b0}
// .fdt-main{font-weight:600;color:#1a2e4a}
// .fdt-muted{color:#9aa3b0;font-size:11px}
// .fdt-r{text-align:right!important}
// .fdt-center{text-align:center!important}
// .fdt-curr{font-variant-numeric:tabular-nums}
// .fdt-neg{color:#dc2626!important}
// .fdt-hl{background:#f0f5fc!important}
// .fdt-foot .fdt-hl{background:#e0ebf8!important}
// .fdt-pct-wrap{display:flex;align-items:center;gap:5px;min-width:65px}
// .fdt-pct-bar{height:4px;border-radius:2px;flex-shrink:0;min-width:2px;max-width:44px}
// .fdt-mo-sub td{background:#f0f5fb!important;font-size:11px;border-bottom:1px solid #e4ecf7!important}
// .fdt-mo-sub:last-child td{border-bottom:1px solid #e8edf3!important}

// /* Pill labels */
// .fd-pill-yes{display:inline-block;padding:2px 7px;border-radius:9px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d}
// .fd-pill-no{display:inline-block;padding:2px 7px;border-radius:9px;font-size:10px;font-weight:700;background:#fef9c3;color:#854d0e}
// .fd-chip{font-size:10px;background:#eef0f5;border:1px solid #e0e4ea;border-radius:4px;padding:2px 6px;color:#596270;font-weight:600}

// /* Summary number cards inside modal */
// .fd-sum-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}
// @media(max-width:900px){.fd-sum-cards{grid-template-columns:repeat(3,1fr)}}
// @media(max-width:600px){.fd-sum-cards{grid-template-columns:repeat(2,1fr)}}
// .fd-sum-card{background:#fff;border:1px solid #e4e8ef;border-radius:9px;padding:12px 14px;border-top:3px solid #1a4f8a}
// .fd-sum-card-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9aa3b0;margin-bottom:4px}
// .fd-sum-card-value{font-size:16px;font-weight:800;line-height:1.1;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
// .fd-sum-card-sub{font-size:10px;color:#9aa3b0;margin-bottom:6px}
// .fd-sum-card-bar-bg{height:3px;background:#eef0f5;border-radius:2px;overflow:hidden}
// .fd-sum-card-bar{height:100%;border-radius:2px;transition:width .5s}

// /* Table column widths */
// .fdt-type{min-width:130px;max-width:180px}
// .fdt-head{min-width:90px;max-width:130px}
// .fdt-num-col{min-width:80px;white-space:nowrap}

// /* Loading / error */
// .fd-modal-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;color:#9aa3b0;font-size:13px;gap:12px}
// .fd-modal-error{text-align:center;padding:40px;font-size:13px;color:#9aa3b0}
// .fd-spinner{width:28px;height:28px;border:2.5px solid #e0e4ea;border-top-color:#1a4f8a;border-radius:50%;animation:fd-spin .7s linear infinite}
// @keyframes fd-spin{to{transform:rotate(360deg)}}

// /* Mobile */
// @media(max-width:900px){
// 	#fd-modal{flex-direction:column;height:92vh;border-radius:14px 14px 0 0}
// 	#fd-modal-overlay{align-items:flex-end;padding:0}
// 	#fd-modal-sidebar{width:100%;min-width:0;max-height:56px;flex-direction:row;background:#f8f9fb;border-right:none;border-bottom:1px solid #e4e8ef}
// 	#fd-modal-roadmap{display:none}
// 	#fd-modal-nav{flex-direction:row;display:flex;padding:0 10px;overflow-x:auto;overflow-y:hidden;flex:1}
// 	.fd-modal-nav-title{display:none}
// 	.fd-modal-nav-item{padding:8px 10px;white-space:nowrap;flex-shrink:0;border-radius:0}
// }
// </style>`;}
// }



frappe.pages['creche-finance-dashboard'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Finance Dashboard',
		single_column: true,
	});
	new FinanceDashboard(page, wrapper);
};

class FinanceDashboard {
	constructor(page, wrapper) {
		this.page               = page;
		this.$root              = $(wrapper).find('.page-content');
		this.filter_options     = {};
		this.filter_values      = {};
		this.partner_name_to_id = {};
		this.summary_data       = {};
		this.init();
	}

	async init() {
		// Inject modal once into body
		if (!$('#fd-modal-overlay').length) {
			$('body').append(`
				<div id="fd-modal-overlay">
					<div id="fd-modal">
						<div id="fd-modal-main">
							<div id="fd-modal-main-header">
								<div id="fd-modal-title-wrap">
									<div id="fd-modal-title"></div>
									<div id="fd-modal-subtitle"></div>
								</div>
								<button id="fd-modal-close">×</button>
							</div>
							<div id="fd-modal-partnertabs"></div>
							<div id="fd-modal-body"></div>
						</div>
					</div>
				</div>
			`);
			$(document).on('click','#fd-modal-close', () => $('#fd-modal-overlay').removeClass('open'));
			$(document).on('click','#fd-modal-overlay', (e) => { if(e.target.id==='fd-modal-overlay') $('#fd-modal-overlay').removeClass('open'); });
		}

		this.$root.html(this._styles() + `
			<div id="fd-wrap" class="fd-wrap">
				<div class="fd-filter-bar" id="fd-filter-bar"></div>
				<div id="fd-cards"></div>
				<div id="fd-summary-bar"></div>
			</div>
		`);
		this.$el      = this.$root.find('#fd-wrap');
		this.$cards   = this.$root.find('#fd-cards');
		this.$bar     = this.$root.find('#fd-filter-bar');
		this.$summary = this.$root.find('#fd-summary-bar');

		await this._load_filter_options();
		this._render_filter_bar();
		await this.refresh();
	}

	// ─── Filter options ────────────────────────────────────────────────────────
	async _load_filter_options(cascade = false) {
		const args = cascade ? this._filters_for_cascade() : {};
		const r = await frappe.call({ method:'creche_reports.api.dashboard.get_dashboard_filters', args });
		this.filter_options = r.message || {};
		this.partner_name_to_id = {};
		(this.filter_options.partners||[]).forEach(p => { this.partner_name_to_id[p.name] = p.id; });
	}

	// ─── Filter bar ────────────────────────────────────────────────────────────
	_render_filter_bar() {
		const fo = this.filter_options;
		this.$bar.empty();
		const defs = [
			{ key:'year',     label:'Year',     opts:fo.financial_years||[] },
			{ key:'partner',  label:'Partner',  opts:(fo.partners||[]).map(p=>p.name) },
			{ key:'grant',    label:'Grant',    opts:fo.grants||[] },
			{ key:'state',    label:'State',    opts:fo.states||[] },
			{ key:'district', label:'District', opts:fo.districts||[] },
			{ key:'block',    label:'Block',    opts:fo.blocks||[] },
			{ key:'month',    label:'Month',    opts:fo.months||[] },
			{ key:'quarter',  label:'Quarter',  opts:fo.quarters||[] },
		];
		const $grid = $('<div class="fd-filter-grid"></div>');
		this.$bar.append($grid);
		defs.forEach(fd => {
			const $f = $(`<div class="fd-filter-field">
				<label class="fd-filter-label">${fd.label}</label>
				<div class="fd-ms-wrap" data-key="${fd.key}">
					<div class="fd-ms-box">
						<div class="fd-ms-tags" data-key="${fd.key}"></div>
						<input class="fd-ms-input" type="text" placeholder="${fd.opts.length?'Select...':'No options'}"
							autocomplete="off" data-key="${fd.key}" ${!fd.opts.length?'disabled':''}>
					</div>
					<div class="fd-ms-dropdown" data-key="${fd.key}" style="display:none"></div>
				</div>
			</div>`);
			$grid.append($f);
			this._init_ms($f, fd.key, fd.opts, this.filter_values[fd.key]||[]);
		});
		const $btns = $(`<div class="fd-bar-btns">
			<button class="btn btn-primary btn-sm">&#10003; Apply Filters</button>
			<button class="btn btn-default btn-sm fd-clear-btn">Clear All</button>
		</div>`);
		this.$bar.append($btns);
		$btns.find('.btn-primary').on('click', ()=>this.refresh());
		$btns.find('.fd-clear-btn').on('click', async ()=>{
			this.filter_values={};
			await this._load_filter_options(false);
			this._render_filter_bar();
			this.refresh();
		});
		$(document).off('click.fd-ms').on('click.fd-ms', (e)=>{
			if (!$(e.target).closest('.fd-ms-wrap').length) {
				this.$bar.find('.fd-ms-dropdown').hide();
				this.$bar.find('.fd-ms-box').removeClass('fd-ms-open');
			}
		});
	}

	_init_ms($field, key, opts, selected) {
		const $wrap=$field.find(`.fd-ms-wrap[data-key="${key}"]`);
		const $box=$wrap.find('.fd-ms-box'), $tags=$wrap.find(`.fd-ms-tags[data-key="${key}"]`);
		const $inp=$wrap.find(`.fd-ms-input[data-key="${key}"]`), $dd=$wrap.find(`.fd-ms-dropdown[data-key="${key}"]`);
		let sel=new Set(selected);
		const rtags=()=>{ $tags.empty(); sel.forEach(v=>{ const $t=$(`<span class="fd-ms-tag">${this._esc(v)}<span class="fd-ms-tag-x">×</span></span>`); $t.find('.fd-ms-tag-x').on('click',(e)=>{ e.stopPropagation(); sel.delete(v); this.filter_values[key]=[...sel]; rtags(); rdd(); this._schedule_cascade(); }); $tags.append($t); }); };
		const rdd=(q='')=>{ $dd.empty(); const items=opts.filter(o=>o.toLowerCase().includes(q.toLowerCase())&&!sel.has(o)); if(!items.length){$dd.html('<div class="fd-ms-empty">No options</div>');return;} items.forEach(opt=>{ const $i=$(`<div class="fd-ms-item">${this._esc(opt)}</div>`); $i.on('mousedown',(e)=>{ e.preventDefault(); sel.add(opt); this.filter_values[key]=[...sel]; $inp.val(''); rtags(); rdd(''); this._schedule_cascade(); }); $dd.append($i); }); };
		$box.on('click',(e)=>{ if($(e.target).hasClass('fd-ms-tag-x'))return; this.$bar.find('.fd-ms-dropdown').not($dd).hide(); this.$bar.find('.fd-ms-box').not($box).removeClass('fd-ms-open'); $box.addClass('fd-ms-open'); rdd($inp.val()); $dd.show(); $inp.focus(); });
		$inp.on('input',()=>rdd($inp.val()));
		$inp.on('keydown',(e)=>{ if(e.key==='Backspace'&&!$inp.val()&&sel.size){ const last=[...sel].pop(); sel.delete(last); this.filter_values[key]=[...sel]; rtags(); rdd(); this._schedule_cascade(); } if(e.key==='Escape'){$dd.hide();$box.removeClass('fd-ms-open');} });
		rtags();
	}

	_schedule_cascade() {
		clearTimeout(this._cascade_timer);
		this._cascade_timer=setTimeout(async()=>{ const saved={...this.filter_values}; await this._load_filter_options(true); const fo=this.filter_options; const no={year:fo.financial_years||[],partner:(fo.partners||[]).map(p=>p.name),grant:fo.grants||[],state:fo.states||[],district:fo.districts||[],block:fo.blocks||[],month:fo.months||[],quarter:fo.quarters||[]}; Object.keys(no).forEach(k=>{ const v=new Set(no[k]); this.filter_values[k]=(saved[k]||[]).filter(x=>v.has(x)); }); this._render_filter_bar(); },500);
	}
	_filters_for_cascade() {
		const g=k=>this.filter_values[k]||[];
		return { financial_year:g('year').join(','), partner_id:g('partner').map(n=>this.partner_name_to_id[n]).filter(Boolean).join(','), grant_id:g('grant').join(','), state:g('state').join(','), district:g('district').join(','), block:g('block').join(',') };
	}
	_active_filters() {
		const g=k=>this.filter_values[k]||[];
		return { financial_year:g('year').join(','), partner_id:g('partner').map(n=>this.partner_name_to_id[n]).filter(Boolean).join(','), grant_id:g('grant').join(','), state:g('state').join(','), district:g('district').join(','), block:g('block').join(','), month:g('month').join(','), quarter:g('quarter').join(',') };
	}

	// ─── Refresh ───────────────────────────────────────────────────────────────
	async refresh() {
		this._set_loading(true);
		try {
			const r=await frappe.call({method:'creche_reports.api.dashboard.get_dashboard_summary',args:this._active_filters()});
			this.summary_data=r.message||{};
			this._render_cards(this.summary_data);
			this._render_summary_bar(this.summary_data);
		} finally { this._set_loading(false); }
	}

	// ─── Summary bar ───────────────────────────────────────────────────────────
	_render_summary_bar(s) {
		if (!s||!Object.keys(s).length) { this.$summary.empty(); return; }
		this.$summary.html(`<div class="fd-sum-bar">
			<div class="fd-sum-item"><span class="fd-sum-label">Partners</span><span class="fd-sum-val">${s.total_partners||0}</span></div>
			<div class="fd-sum-div"></div>
			<div class="fd-sum-item"><span class="fd-sum-label">Total Budget</span><span class="fd-sum-val">${this._fmt_inr(s.total_budget,true)}</span></div>
			<div class="fd-sum-div"></div>
			<div class="fd-sum-item"><span class="fd-sum-label">Utilised</span><span class="fd-sum-val">${this._fmt_inr(s.total_utilisation,true)}</span><span class="fd-sum-pct">${this._pct(s.total_utilisation,s.total_budget)}</span></div>
			<div class="fd-sum-div"></div>
			<div class="fd-sum-item"><span class="fd-sum-label">Disbursed</span><span class="fd-sum-val">${this._fmt_inr(s.total_disbursed,true)}</span><span class="fd-sum-pct">${this._pct(s.total_disbursed,s.total_budget)}</span></div>
			<div class="fd-sum-div"></div>
			<div class="fd-sum-item"><span class="fd-sum-label">Balance</span><span class="fd-sum-val">${this._fmt_inr(s.balance_available,true)}</span></div>
			<div class="fd-sum-div"></div>
			<div class="fd-sum-item"><span class="fd-sum-label">Bank Balance</span><span class="fd-sum-val">${this._fmt_inr(s.total_balance_bank,true)}</span></div>

		</div>`);
	}

	// ─── Cards ─────────────────────────────────────────────────────────────────
	_render_cards(s) {
		const primary=[
			{key:'budget',      hex:'#2490EF',label:'Total Budget',    value:s.total_budget,      sub:`${s.total_partners||0} partner${s.total_partners===1?'':'s'}`,compact:true,pl:'Budget Breakdown',       icon:this._icon_budget()},
			{key:'utilisation', hex:'#28A745',label:'Utilisation',     value:s.total_utilisation, sub:this._pct(s.total_utilisation,s.total_budget)+' of budget',    compact:true,pl:'Utilisation Breakdown',  icon:this._icon_utilisation()},
			{key:'disbursed',   hex:'#E67E22',label:'Disbursed',       value:s.total_disbursed,   sub:this._pct(s.total_disbursed,s.total_budget)+' of budget',      compact:true,pl:'Disbursement Breakdown', icon:this._icon_disbursed()},
		];
		const info=[
			{key:'balance',    hex:'#8E44AD',label:'Balance Available',   value:s.balance_available,   sub:'Budget − Utilised',                    compact:true, icon:this._icon_balance()},
			{key:'bank',       hex:'#1ABC9C',label:'Balance as per Bank', value:s.total_balance_bank,  sub:'Bank + Cash at end of reported month', compact:true, icon:this._icon_bank()},
		];
		this.$cards.empty();
		const $p=$('<div class="fd-cards-row fd-cards-primary"></div>');
		primary.forEach(c=>{
			const $card=$(`<div class="fd-card fd-card-popup" style="--card-color:${c.hex}">
				<div class="fd-card-inner">
					<div class="fd-card-top">
						<div class="fd-card-icon-wrap" style="background:${c.hex}18;color:${c.hex}">${c.icon}</div>
						<div class="fd-card-open-btn" style="color:${c.hex};border-color:${c.hex}30;background:${c.hex}0d">View Breakdown ↗</div>
					</div>
					<div class="fd-card-value" style="color:${c.hex}">${this._fmt_inr(c.value,c.compact)}</div>
					<div class="fd-card-label">${c.label}</div>
					<div class="fd-card-sub">${c.sub}</div>
				</div>
				<div class="fd-card-bar" style="background:${c.hex}"></div>
			</div>`);
			$card.on('click',()=>this._open_modal(c.key,c.pl,c.hex));
			$p.append($card);
		});
		const $i=$('<div class="fd-cards-row fd-cards-info"></div>');
		info.forEach(c=>{
			const display=c.is_count?(c.value||0):this._fmt_inr(c.value,c.compact);
			$i.append(`<div class="fd-card fd-card-info" style="--card-color:${c.hex}">
				<div class="fd-card-inner">
					<div class="fd-card-top"><div class="fd-card-icon-wrap fd-card-icon-sm" style="background:${c.hex}18;color:${c.hex}">${c.icon}</div></div>
					<div class="fd-card-value fd-card-value-sm">${display}</div>
					<div class="fd-card-label">${c.label}</div>
					<div class="fd-card-sub">${c.sub}</div>
				</div>
				<div class="fd-card-bar" style="background:${c.hex}"></div>
			</div>`);
		});
		this.$cards.append($p).append($i);
	}

	// ─── Open modal ────────────────────────────────────────────────────────────
	async _open_modal(card_key, title, hex) {
		$('#fd-modal-title').text(title).css('color', hex);
		$('#fd-modal-subtitle').text('Loading data…');
		$('#fd-modal-partnertabs').empty();
		$('#fd-modal-body').html(`<div class="fd-modal-loading"><div class="fd-spinner"></div><p>Loading breakdown…</p></div>`);
		$('#fd-modal-overlay').addClass('open');

		try {
			const pR = await frappe.call({method:'creche_reports.api.dashboard.get_partner_breakdown',args:this._active_filters()});
			const partners = pR.message||[];
			const bResults = await Promise.all(partners.map(p=>
				frappe.call({method:'creche_reports.api.dashboard.get_budget_breakdown',args:{...this._active_filters(),partner_id:p.partner_id}})
			));
			const allBudgets=[];
			bResults.forEach((br,pi)=>(br.message||[]).forEach(b=>allBudgets.push({...b,_pi:pi})));
			const af=this._active_filters();
			const eResults=await Promise.all(allBudgets.map(b=>
				frappe.call({method:'creche_reports.api.dashboard.get_budget_expense_breakdown',
					args:{budget_reference_id:b.budget_reference_id,month:af.month||'',quarter:af.quarter||''}})
			));
			this._render_modal(card_key,title,hex,partners,allBudgets,eResults);
		} catch(err) {
			$('#fd-modal-body').html(`<div class="fd-modal-error">⚠️ Failed to load data. Please try again.</div>`);
			console.error(err);
		}
	}

	// ─── Render modal ──────────────────────────────────────────────────────────
	_render_modal(card_key, title, hex, partners, allBudgets, eResults) {
		const cfg={
			budget:      {pk:'total_budget',      ek:'total_budget',   el:'Budget'},
			utilisation: {pk:'total_utilisation',  ek:'total_utilised', el:'Utilised'},
			disbursed:   {pk:'total_disbursed',    ek:'total_disbursed',el:'Disbursed'},
		}[card_key]||{pk:'total_budget',ek:'total_budget',el:'Budget'};

		const COLORS=['#2490EF','#28A745','#E67E22','#8E44AD','#1ABC9C','#E74C3C','#3498DB','#F39C12','#16A085','#D35400'];

		const grandVal = partners.reduce((s,p)=>s+(p[cfg.pk]||0),0);

		// Update subtitle
		$('#fd-modal-subtitle').html(`<span style="color:${hex};font-weight:700">${this._fmt_inr(grandVal,true)}</span> · ${partners.length} partner${partners.length===1?'':'s'} · ${allBudgets.length} budget${allBudgets.length===1?'':'s'}`);

		// ── PARTNER TABS ──
		const $tabs=$('#fd-modal-partnertabs').empty();
		if(partners.length > 1){
			const $tabList=$('<div class="fd-partner-tabs"></div>');
			$tabList.append(`<button class="fd-ptab active" data-nav="all">All Partners</button>`);
			partners.forEach((p,pi)=>{
				const color=COLORS[pi%COLORS.length];
				$tabList.append(`<button class="fd-ptab" data-nav="p${pi}" style="--ptab-color:${color}">${this._esc(p.partner_name)}</button>`);
			});
			$tabs.append($tabList);
		}

		// ── RENDER VIEW ──
		const renderView=(navId)=>{
			$tabs.find('.fd-ptab').removeClass('active');
			$tabs.find(`[data-nav="${navId}"]`).addClass('active');
			const isAll=(navId==='all');
			const pi=isAll?null:parseInt(navId.replace('p',''));
			const partnersToShow=isAll?partners:[partners[pi]];

			if(!isAll){
				const p=partners[pi];
				$('#fd-modal-subtitle').html(`<span style="color:${COLORS[pi%COLORS.length]};font-weight:700">${this._esc(p.partner_name)}</span> · <span style="color:${hex}">${this._fmt_inr(p[cfg.pk]||0,true)}</span>`);
			} else {
				$('#fd-modal-subtitle').html(`<span style="color:${hex};font-weight:700">${this._fmt_inr(grandVal,true)}</span> · ${partners.length} partner${partners.length===1?'':'s'} · ${allBudgets.length} budget${allBudgets.length===1?'':'s'}`);
			}

			const $body=$('#fd-modal-body').empty();

			// ── SUMMARY NUMBER CARDS ──
			const vBud  = partnersToShow.reduce((s,p)=>s+(p.total_budget||0),0);
			const vUtil = partnersToShow.reduce((s,p)=>s+(p.total_utilisation||0),0);
			const vDisb = partnersToShow.reduce((s,p)=>s+(p.total_disbursed||0),0);
			const vBal  = partnersToShow.reduce((s,p)=>s+(p.balance_available||0),0);
			const vBank = partnersToShow.reduce((s,p)=>s+(p.balance_bank||0),0);
			const vUp   = vBud?Math.round((vUtil/vBud)*100):0;
			const vDp   = vBud?Math.round((vDisb/vBud)*100):0;
			const vUc   = vUp>100?'#dc2626':vUp>=60?'#d97706':'#15803d';
			const vDc   = vDp>100?'#dc2626':vDp>=60?'#d97706':'#15803d';

			const sumCards=[
				{label:'Total Budget',   value:vBud,  sub:`${partnersToShow.length} partner${partnersToShow.length===1?'':'s'}`, color:'#1a4f8a', pct:null},
				{label:'Utilised',       value:vUtil, sub:`${vUp}% of budget`,    color:vUc,       pct:vUp},
				{label:'Disbursed',      value:vDisb, sub:`${vDp}% of budget`,    color:vDc,       pct:vDp},
				{label:'Balance Avail.', value:vBal,  sub:'Budget − Utilised',    color:'#6b21a8', pct:null},
				{label:'Bank Balance',   value:vBank, sub:'End of reported month', color:'#0f766e', pct:null},
			];
			const $sumCards=$('<div class="fd-sum-cards"></div>');
			sumCards.forEach(c=>{
				const bw=c.pct!==null?Math.min(100,Math.max(0,c.pct)):null;
				$sumCards.append(`<div class="fd-sum-card" style="border-top:3px solid ${c.color}">
					<div class="fd-sum-card-label">${c.label}</div>
					<div class="fd-sum-card-value" style="color:${c.color}">${this._fmt_inr(c.value,true)}</div>
					<div class="fd-sum-card-sub">${c.sub}</div>
					${bw!==null?`<div class="fd-sum-card-bar-bg"><div class="fd-sum-card-bar" style="width:${bw}%;background:${c.color}"></div></div>`:''}
				</div>`);
			});
			$body.append($sumCards);

			// ── PARTNER BLOCKS ──
			partnersToShow.forEach(p=>{
				const realPi=partners.indexOf(p);
				const color=COLORS[realPi%COLORS.length];
				const pBudgets=allBudgets.filter(b=>b._pi===realPi);

				if(isAll&&partners.length>1){
					$body.append(`<div class="fd-modal-partner-hdr" style="border-left-color:${color}">
						<span class="fd-nav-dot" style="background:${color}"></span>
						<strong style="color:${color}">${this._esc(p.partner_name)}</strong>
						<span class="fd-modal-hdr-meta">${this._esc(p.states||'')} · ${pBudgets.length} budget${pBudgets.length===1?'':'s'}</span>
					</div>`);
				}

				pBudgets.forEach((b,bi)=>{
					const globalIdx=allBudgets.indexOf(b);
					const exp_data=eResults[globalIdx]?.message||{};
					const expenses=exp_data.expense_breakdown||[];
					const months=exp_data.monthly_summary||[];
					const bBud=b.total_budget||0;
					const bUtil=b.total_utilisation||0;
					const bDisb=b.total_disbursed||0;
					const bBal=b.balance_available||0;
					const bPct=bBud?Math.round((bUtil/bBud)*100):0;
					const bUc=bPct>100?'#dc2626':bPct>=60?'#d97706':'#15803d';
					const uid=`${realPi}_${bi}`;

					// Budget header — collapsed by default, click to expand
					const $budHdr=$(`<div class="fd-modal-budget-hdr" data-uid="${uid}">
						<div class="fd-modal-budget-hdr-left">
							<span class="fd-bud-caret" id="caret_${uid}">▶</span>
							<span class="fd-modal-grant" style="color:${color}">${this._esc(b.grant_id||'—')}</span>
							${b.budget_reference_name?`<span class="fd-modal-ref">${this._esc(b.budget_reference_name)}</span>`:''}
							<span class="fd-modal-chips">
								${b.financial_year?`<span class="fd-chip">${this._esc(b.financial_year)}</span>`:''}
								${b.state?`<span class="fd-chip">${this._esc(b.state)}</span>`:''}
								${b.district?`<span class="fd-chip">${this._esc(b.district)}</span>`:''}
							</span>
						</div>
						<div class="fd-modal-budget-hdr-right">
							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Budget</span><span class="fd-modal-kpi-v">${this._fmt_inr(bBud,true)}</span></span>
							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Utilised</span><span class="fd-modal-kpi-v" style="color:${bUc}">${this._fmt_inr(bUtil,true)}</span></span>
							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Disbursed</span><span class="fd-modal-kpi-v">${this._fmt_inr(bDisb,true)}</span></span>
							<span class="fd-modal-kpi"><span class="fd-modal-kpi-l">Balance</span><span class="fd-modal-kpi-v ${bBal<0?'fdt-neg':''}">${this._fmt_inr(bBal,true)}</span></span>
							<span class="fd-util-badge" style="background:${bUc}18;color:${bUc};border:1px solid ${bUc}30">${bPct}%</span>
						</div>
					</div>`);
					$body.append($budHdr);

					// Content block — hidden by default, expand on click
					const $content=$(`<div class="fd-modal-budget-content" id="bcon_${uid}" style="display:none"></div>`);

					// ── TABLE 1: Expense Line Items ──
					if(expenses.length){
						const eTotBud =expenses.reduce((s,e)=>s+(e.total_budget||0),0);
						const eTotVal =expenses.reduce((s,e)=>s+(e[cfg.ek]||0),0);
						const eTotUti =expenses.reduce((s,e)=>s+(e.total_utilised||0),0);
						const eTotDisb=expenses.reduce((s,e)=>s+(e.total_disbursed||0),0);
						const eTotBal =expenses.reduce((s,e)=>s+(e.balance||0),0);
						const eTotY1  =expenses.reduce((s,e)=>s+(e.year_1||0),0);
						const eTotY2  =expenses.reduce((s,e)=>s+(e.year_2||0),0);
						const eTotY3  =expenses.reduce((s,e)=>s+(e.year_3||0),0);
						const eTotCYB =expenses.reduce((s,e)=>s+(e.current_year_budget||0),0);
						const eTotMB  =expenses.reduce((s,e)=>s+(e.monthly_budget||0),0);
						const eTotBTD =expenses.reduce((s,e)=>s+(e.budget_to_date||0),0);

						// ── Budget card: show full budget breakdown columns ──
						if(card_key==='budget'){
							const exp_rows=expenses.map((e,ei)=>{
								const eb=e.total_budget||0;
								return `<tr>
									<td class="fdt-num">${ei+1}</td>
									<td class="fdt-main fdt-type" style="border-left:3px solid ${color}">${this._esc(e.type_of_expenses||'—')}</td>
									<td class="fdt-muted fdt-head">${this._esc(e.budget_main_head||'—')}</td>
									<td class="fdt-muted fdt-head">${this._esc(e.budget_sub_head||'—')}</td>
									<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.year_1)}</td>
									<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.year_2)}</td>
									<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.year_3)}</td>
									<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eb)}</strong></td>
									<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.current_year_budget)}</td>
									<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.monthly_budget)}</td>
									<td class="fdt-r fdt-curr fdt-num-col fdt-hl">${this._fmt_inr(e.budget_to_date)}</td>
								</tr>`;
							}).join('');
							$content.append(`
								<div class="fd-tbl-label">Expense Line Items <span class="fd-chip">${expenses.length}</span></div>
								<div class="fd-tbl-scroll">
									<table class="fd-tbl">
										<thead>
											<tr>
												<th class="fdt-num" rowspan="2">#</th>
												<th class="fdt-type" rowspan="2">Expense Type</th>
												<th class="fdt-head" rowspan="2">Main Head</th>
												<th class="fdt-head" rowspan="2">Sub Head</th>
												<th class="fdt-r fdt-num-col" colspan="3" style="text-align:center;border-bottom:1px solid rgba(255,255,255,.15)">Yearly Budget</th>
												<th class="fdt-r fdt-num-col fdt-hl" rowspan="2">Total Budget</th>
												<th class="fdt-r fdt-num-col" rowspan="2">Cur. Year Bud.</th>
												<th class="fdt-r fdt-num-col" rowspan="2">Monthly Bud.</th>
												<th class="fdt-r fdt-num-col fdt-hl" rowspan="2">Budget to Date</th>
											</tr>
											<tr>
												<th class="fdt-r fdt-num-col">Y1</th>
												<th class="fdt-r fdt-num-col">Y2</th>
												<th class="fdt-r fdt-num-col">Y3</th>
											</tr>
										</thead>
										<tbody>${exp_rows}</tbody>
										<tfoot><tr class="fdt-foot">
											<td></td><td><strong>Total</strong></td><td></td><td></td>
											<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotY1)}</td>
											<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotY2)}</td>
											<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotY3)}</td>
											<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eTotBud)}</strong></td>
											<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotCYB)}</td>
											<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotMB)}</td>
											<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eTotBTD)}</strong></td>
										</tr></tfoot>
									</table>
								</div>`);

						// ── Utilisation card: budget vs utilised vs balance + % ──
						} else if(card_key==='utilisation'){
							const exp_rows=expenses.map((e,ei)=>{
								const eb=e.total_budget||0, eu=e.total_utilised||0, ebal=e.balance||0;
								const pct=e.pct_utilised||0, bw=Math.min(100,Math.max(0,pct));
								const ec=pct>100?'#dc2626':pct>85?'#d97706':'#15803d';
								return `<tr>
									<td class="fdt-num">${ei+1}</td>
									<td class="fdt-main fdt-type" style="border-left:3px solid ${color}">${this._esc(e.type_of_expenses||'—')}</td>
									<td class="fdt-muted fdt-head">${this._esc(e.budget_main_head||'—')}</td>
									<td class="fdt-muted fdt-head">${this._esc(e.budget_sub_head||'—')}</td>
									<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eb)}</strong></td>
									<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(e.budget_to_date)}</td>
									<td class="fdt-r fdt-curr fdt-num-col fdt-accent-col" style="color:${hex};background:${hex}12"><strong>${this._fmt_inr(eu)}</strong></td>
									<td class="fdt-r fdt-curr fdt-num-col ${ebal<0?'fdt-neg':''}">${this._fmt_inr(ebal)}</td>
									<td class="fdt-r fdt-num-col">
										<div class="fdt-pct-wrap">
											<div class="fdt-pct-bar" style="width:${bw}%;background:${ec}"></div>
											<span style="font-size:10px;font-weight:700;color:${ec}">${pct}%</span>
										</div>
									</td>
								</tr>`;
							}).join('');
							$content.append(`
								<div class="fd-tbl-label">Expense Line Items <span class="fd-chip">${expenses.length}</span></div>
								<div class="fd-tbl-scroll">
									<table class="fd-tbl">
										<thead><tr>
											<th class="fdt-num">#</th>
											<th class="fdt-type">Expense Type</th>
											<th class="fdt-head">Main Head</th>
											<th class="fdt-head">Sub Head</th>
											<th class="fdt-r fdt-num-col fdt-hl">Total Budget</th>
											<th class="fdt-r fdt-num-col">Budget to Date</th>
											<th class="fdt-r fdt-num-col fdt-th-accent" style="background:${hex}dd">Utilised</th>
											<th class="fdt-r fdt-num-col">Balance</th>
											<th class="fdt-r fdt-num-col">% Util</th>
										</tr></thead>
										<tbody>${exp_rows}</tbody>
										<tfoot><tr class="fdt-foot">
											<td></td><td><strong>Total</strong></td><td></td><td></td>
											<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eTotBud)}</strong></td>
											<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(eTotBTD)}</td>
											<td class="fdt-r fdt-curr fdt-num-col fdt-accent-col" style="color:${hex};background:${hex}18"><strong>${this._fmt_inr(eTotUti)}</strong></td>
											<td class="fdt-r fdt-curr fdt-num-col ${eTotBal<0?'fdt-neg':''}"><strong>${this._fmt_inr(eTotBal)}</strong></td>
											<td></td>
										</tr></tfoot>
									</table>
								</div>`);

						// ── Disbursed card: budget vs disbursed vs balance ──
						} else {
							const exp_rows=expenses.map((e,ei)=>{
								const eb=e.total_budget||0, ed=e.total_disbursed||0, ebal=(eb-ed);
								return `<tr>
									<td class="fdt-num">${ei+1}</td>
									<td class="fdt-main fdt-type" style="border-left:3px solid ${color}">${this._esc(e.type_of_expenses||'—')}</td>
									<td class="fdt-muted fdt-head">${this._esc(e.budget_main_head||'—')}</td>
									<td class="fdt-muted fdt-head">${this._esc(e.budget_sub_head||'—')}</td>
									<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eb)}</strong></td>
									<td class="fdt-r fdt-curr fdt-num-col fdt-accent-col" style="color:${hex};background:${hex}12"><strong>${this._fmt_inr(ed)}</strong></td>
									<td class="fdt-r fdt-curr fdt-num-col ${ebal<0?'fdt-neg':''}">${this._fmt_inr(ebal)}</td>
								</tr>`;
							}).join('');
							$content.append(`
								<div class="fd-tbl-label">Expense Line Items <span class="fd-chip">${expenses.length}</span></div>
								<div class="fd-tbl-scroll">
									<table class="fd-tbl">
										<thead><tr>
											<th class="fdt-num">#</th>
											<th class="fdt-type">Expense Type</th>
											<th class="fdt-head">Main Head</th>
											<th class="fdt-head">Sub Head</th>
											<th class="fdt-r fdt-num-col fdt-hl">Total Budget</th>
											<th class="fdt-r fdt-num-col fdt-th-accent" style="background:${hex}dd">Disbursed</th>
											<th class="fdt-r fdt-num-col">Balance</th>
										</tr></thead>
										<tbody>${exp_rows}</tbody>
										<tfoot><tr class="fdt-foot">
											<td></td><td><strong>Total</strong></td><td></td><td></td>
											<td class="fdt-r fdt-curr fdt-num-col fdt-hl"><strong>${this._fmt_inr(eTotBud)}</strong></td>
											<td class="fdt-r fdt-curr fdt-num-col fdt-accent-col" style="color:${hex};background:${hex}18"><strong>${this._fmt_inr(eTotDisb)}</strong></td>
											<td class="fdt-r fdt-curr fdt-num-col ${(eTotBud-eTotDisb)<0?'fdt-neg':''}"><strong>${this._fmt_inr(eTotBud-eTotDisb)}</strong></td>
										</tr></tfoot>
									</table>
								</div>`);
						}
					}

					// ── TABLE 2: Monthly Breakdown (not shown for budget card) ──
					if(months.length && card_key!=='budget'){
						const moTotBud=months.reduce((s,m)=>s+(m.monthly_budget||0),0);
						const moTotUti=months.reduce((s,m)=>s+(m.total_utilised||0),0);
						const moTotBal=months.reduce((s,m)=>s+(m.balance||0),0);

						const mo_rows=months.map((m,mi)=>{
							const pct=m.pct_utilised||0, bw=Math.min(100,Math.max(0,pct));
							const mc=pct>100?'#dc2626':pct>85?'#d97706':'#15803d';
							const neg=(m.balance||0)<0;
							const decl=m.declaration
								?`<span class="fd-pill-yes">✓ Declared</span>`
								:`<span class="fd-pill-no">Pending</span>`;
							const muid=`m_${uid}_${mi}`;
							const has_items=card_key==='utilisation'&&m.items&&m.items.length;

							const sub_rows=(card_key==='utilisation'?m.items||[]:[]).map(it=>{
								const itv = it[cfg.ek] || it.utilised || it.total_utilised || 0;
								const itb = it.monthly_budget || 0;
								const itbal = it.balance || 0;
								const itn = itbal < 0;
								const itPct = itb ? Math.min(999, Math.round((itv/itb)*100)) : 0;
								const itUc  = itPct>100?'#dc2626':itPct>=60?'#d97706':'#15803d';
								return `<tr class="fdt-mo-sub fd-mo-sub-${muid}" style="display:none;background:#f0f5fb">
									<td class="fdt-num" style="color:#c0c8d4">—</td>
									<td style="padding-left:22px;color:#374151;font-size:11px;font-weight:500">${this._esc(it.type_of_expenses||'—')}</td>
									<td class="fdt-muted" style="font-size:11px">${this._esc(it.budget_main_head||'—')}</td>
									<td class="fdt-r fdt-curr fdt-num-col" style="font-size:11px">${this._fmt_inr(itb)}</td>
									<td class="fdt-r fdt-curr fdt-num-col" style="font-size:11px;color:${itUc}">${this._fmt_inr(itv)}</td>
									<td class="fdt-r fdt-curr fdt-num-col ${itn?'fdt-neg':''}" style="font-size:11px">${this._fmt_inr(itbal)}</td>
									<td class="fdt-r fdt-curr fdt-num-col fdt-muted" style="font-size:11px">${this._fmt_inr(it.balance_amount||0)}</td>
									<td class="fdt-r fdt-num-col">
										<div class="fdt-pct-wrap">
											<div class="fdt-pct-bar" style="width:${Math.min(100,itPct)}%;background:${itUc}"></div>
											<span style="font-size:9px;font-weight:700;color:${itUc}">${itPct}%</span>
										</div>
									</td>
									<td></td>
									<td></td>
								</tr>`;
							}).join('');

							return `<tr class="fdt-mo-row">
								<td class="fdt-num">${mi+1}</td>
								<td class="fdt-main"><strong>${this._esc(m.month||'—')}</strong></td>
								<td class="fdt-muted">${this._esc(m.financial_year||'—')}</td>
								<td class="fdt-r fdt-curr fdt-num-col">${this._fmt_inr(m.monthly_budget)}</td>
								<td class="fdt-r fdt-curr fdt-num-col fdt-accent-col" style="color:${mc};background:${hex}10"><strong>${this._fmt_inr(m.total_utilised)}</strong></td>
								<td class="fdt-r fdt-curr fdt-num-col ${neg?'fdt-neg':''}">${this._fmt_inr(m.balance)}</td>
								<td class="fdt-r fdt-curr fdt-num-col fdt-muted">${this._fmt_inr(m.balance_amount)}</td>
								<td class="fdt-r fdt-num-col">
									<div class="fdt-pct-wrap">
										<div class="fdt-pct-bar" style="width:${bw}%;background:${mc}"></div>
										<span style="font-size:10px;font-weight:700;color:${mc}">${pct}%</span>
									</div>
								</td>
								<td class="fdt-center">${decl}</td>
								<td class="fdt-center fdt-mo-btn" data-uid="${muid}" style="cursor:pointer;color:${color};font-weight:700;width:30px">${has_items?'▶':''}</td>
							</tr>${sub_rows}`;
						}).join('');

						$content.append(`
							<div class="fd-tbl-label" style="margin-top:14px">Monthly Breakdown <span class="fd-chip">${months.length} months</span></div>
							<div class="fd-tbl-scroll">
								<table class="fd-tbl">
									<thead>
										<tr>
											<th class="fdt-num">#</th>
											<th class="fdt-type">Month</th>
											<th class="fdt-head">FY</th>
											<th class="fdt-r fdt-num-col">Monthly Bud.</th>
											<th class="fdt-r fdt-num-col fdt-th-accent" style="background:${hex}dd">Actual Utilised</th>
											<th class="fdt-r fdt-num-col">Variance</th>
											<th class="fdt-r fdt-num-col">Bank Bal.</th>
											<th class="fdt-r fdt-num-col">% Util</th>
											<th class="fdt-center" style="min-width:90px">Declaration</th>
											<th style="width:30px"></th>
										</tr>
									</thead>
									<tbody>${mo_rows}</tbody>
									<tfoot><tr class="fdt-foot">
										<td></td><td><strong>Total (${months.length} mo.)</strong></td><td></td>
										<td class="fdt-r fdt-curr fdt-num-col"><strong>${this._fmt_inr(moTotBud)}</strong></td>
										<td class="fdt-r fdt-curr fdt-num-col"><strong>${this._fmt_inr(moTotUti)}</strong></td>
										<td class="fdt-r fdt-curr fdt-num-col ${moTotBal<0?'fdt-neg':''}"><strong>${this._fmt_inr(moTotBal)}</strong></td>
										<td></td><td></td><td></td><td></td>
									</tr></tfoot>
								</table>
							</div>`);
					}

					if(!expenses.length&&(card_key==='budget'||!months.length)){
						$content.html('<div style="padding:16px;text-align:center;color:#9aa3b0;font-size:12px">No expense data for this budget.</div>');
					}

					$body.append($content);

					// Monthly item toggle
					$content.on('click', '.fdt-mo-btn', (e) => {
						const muid = $(e.currentTarget).data('uid');
						const $sub = $content.find(`.fd-mo-sub-${muid}`);
						if(!$sub.length) return;
						const open = $sub.first().is(':visible');
						$sub.toggle(!open);
						$(e.currentTarget).text(open ? '▶' : '▼');
					});

					// Budget block collapse toggle
					$budHdr.on('click', function(){
						const $c = $content;
						const open = $c.is(':visible');
						$c.slideToggle(180);
						$(`#caret_${uid}`).text(open ? '▶' : '▼');
					});
				});
			});
		};

		if(partners.length > 1){
			$tabs.on('click', '.fd-ptab', (e) => renderView($(e.currentTarget).data('nav')));
		}
		renderView('all');
	}

	// ─── Icons ─────────────────────────────────────────────────────────────────
	_icon_budget()      { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`; }
	_icon_utilisation() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`; }
	_icon_disbursed()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>`; }
	_icon_balance()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>`; }
	_icon_warning()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`; }
	_icon_bank()        { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`; }

	// ─── Utilities ─────────────────────────────────────────────────────────────
	_fmt_inr(amount,compact=false){const n=parseFloat(amount)||0,abs=Math.abs(n),sign=n<0?'-':'';if(compact){if(abs>=1e7)return sign+'₹'+(abs/1e7).toFixed(2)+' Cr';if(abs>=1e5)return sign+'₹'+(abs/1e5).toFixed(2)+' L';if(abs>=1e3)return sign+'₹'+(abs/1e3).toFixed(1)+' K';}return sign+'₹'+abs.toLocaleString('en-IN',{maximumFractionDigits:2});}
	_pct(num,den){if(!den)return'0%';return(((num||0)/den)*100).toFixed(1)+'%';}
	_esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
	_set_loading(on){this.$el&&(on?this.$el.addClass('fd-loading'):this.$el.removeClass('fd-loading'));}

	// ─── CSS ───────────────────────────────────────────────────────────────────
	_styles(){return`<style>
/* Base */
.fd-wrap*{box-sizing:border-box}
.fd-wrap{font-family:var(--font-stack);color:var(--text-color);padding:20px 24px}
.fd-wrap.fd-loading{opacity:.5;pointer-events:none}

/* Filter */
.fd-filter-bar{background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);padding:16px 20px 14px;margin-bottom:24px}
.fd-filter-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 14px;margin-bottom:14px}
@media(max-width:1100px){.fd-filter-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.fd-filter-grid{grid-template-columns:repeat(2,1fr)}}
.fd-filter-label{display:block;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.fd-bar-btns{display:flex;gap:8px}
.fd-ms-wrap{position:relative}
.fd-ms-box{display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-height:32px;padding:3px 8px;background:var(--control-bg,#fff);border:1px solid var(--border-color);border-radius:var(--border-radius);cursor:text;transition:border-color .15s,box-shadow .15s}
.fd-ms-box.fd-ms-open,.fd-ms-box:focus-within{border-color:var(--primary-color,#2490EF);box-shadow:0 0 0 2px rgba(36,144,239,.14)}
.fd-ms-tags{display:contents}
.fd-ms-tag{display:inline-flex;align-items:center;gap:4px;background:var(--primary-color,#2490EF);color:#fff;font-size:11px;font-weight:600;padding:2px 6px 2px 8px;border-radius:3px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
.fd-ms-tag-x{cursor:pointer;font-size:14px;opacity:.8;flex-shrink:0}
.fd-ms-tag-x:hover{opacity:1}
.fd-ms-input{border:none;outline:none;background:transparent;font-size:13px;color:var(--text-color);flex:1;min-width:50px;padding:2px 0;font-family:var(--font-stack)}
.fd-ms-input::placeholder{color:var(--text-muted)}
.fd-ms-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--card-bg,#fff);border:1px solid var(--border-color);border-radius:var(--border-radius);box-shadow:0 4px 20px rgba(0,0,0,.12);z-index:1000;max-height:220px;overflow-y:auto}
.fd-ms-item{padding:7px 12px;font-size:13px;cursor:pointer;transition:background .1s}
.fd-ms-item:hover{background:var(--primary-color,#2490EF);color:#fff}
.fd-ms-empty{padding:10px 12px;font-size:12px;color:var(--text-muted);text-align:center}

/* Cards */
.fd-cards-row{display:grid;gap:16px;margin-bottom:16px}
.fd-cards-primary{grid-template-columns:repeat(3,1fr)}
.fd-cards-info{grid-template-columns:repeat(2,1fr)}
@media(max-width:760px){.fd-cards-primary,.fd-cards-info{grid-template-columns:1fr}}
.fd-card{background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);overflow:hidden;transition:box-shadow .18s,transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.fd-card-popup{cursor:pointer}
.fd-card-popup:hover{box-shadow:0 6px 24px rgba(0,0,0,.11);transform:translateY(-2px)}
.fd-card-info{cursor:default;opacity:.9}
.fd-card-bar{height:3px;width:100%}
.fd-card-inner{padding:18px 18px 14px}
.fd-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:8px}
.fd-card-icon-wrap{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fd-card-icon-wrap svg{width:20px;height:20px}
.fd-card-icon-sm{width:32px;height:32px;border-radius:8px}
.fd-card-icon-sm svg{width:16px;height:16px}
.fd-card-open-btn{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.fd-card-value{font-size:28px;font-weight:800;line-height:1.1;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fd-card-value-sm{font-size:22px;color:var(--text-color)!important}
.fd-card-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px}
.fd-card-sub{font-size:11px;color:var(--text-muted)}

/* Summary bar */
.fd-sum-bar{display:flex;align-items:center;flex-wrap:wrap;background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);padding:12px 24px;gap:0;margin-bottom:8px}
.fd-sum-item{display:flex;flex-direction:column;align-items:center;padding:4px 18px;gap:2px}
.fd-sum-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted)}
.fd-sum-val{font-size:15px;font-weight:800;color:var(--text-color)}
.fd-sum-pct{font-size:10px;color:var(--text-muted)}
.fd-sum-div{width:1px;height:32px;background:var(--border-color);flex-shrink:0}

/* ══ MODAL ══ */
#fd-modal-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9000;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
#fd-modal-overlay.open{display:flex}
#fd-modal{background:#fff;width:min(1100px,100%);height:min(88vh,900px);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 32px 100px rgba(0,0,0,.22);animation:fd-modal-in .28s cubic-bezier(.22,.68,0,1.15)}
@keyframes fd-modal-in{from{transform:scale(.95) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}

/* Modal main takes full width */
#fd-modal-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
#fd-modal-main-header{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid #e8edf3;flex-shrink:0;background:#fff}
#fd-modal-title{font-size:17px;font-weight:800;line-height:1.2;margin-bottom:3px;color:#1a2e4a}
#fd-modal-subtitle{font-size:12px;color:#8892a4}
#fd-modal-close{background:#f1f3f6;border:none;cursor:pointer;width:30px;height:30px;border-radius:7px;font-size:16px;color:#596270;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;flex-shrink:0;margin-top:2px;font-weight:700}
#fd-modal-close:hover{background:#e0e4ea;color:#1a2e4a}

/* Partner tabs */
#fd-modal-partnertabs{flex-shrink:0;border-bottom:1px solid #e8edf3;background:#fff;padding:0 18px}
.fd-partner-tabs{display:flex;gap:0;overflow-x:auto;scrollbar-width:none}
.fd-partner-tabs::-webkit-scrollbar{display:none}
.fd-ptab{background:none;border:none;border-bottom:2px solid transparent;padding:9px 14px;font-size:12px;font-weight:600;color:#8892a4;cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s;margin-bottom:-1px}
.fd-ptab:hover{color:#1a2e4a}
.fd-ptab.active{color:#1a4f8a;border-bottom-color:#1a4f8a}
.fd-ptab[style*="--ptab-color"].active{color:var(--ptab-color);border-bottom-color:var(--ptab-color)}

/* Body */
#fd-modal-body{flex:1;overflow-y:auto;padding:14px 20px 20px;background:#f7f8fa}
#fd-modal-body::-webkit-scrollbar{width:5px}
#fd-modal-body::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:3px}

/* Budget block */
.fd-modal-partner-hdr{display:flex;align-items:center;gap:8px;padding:7px 12px;background:#fff;border-radius:7px;margin-bottom:6px;font-size:12px;border:1px solid #e8edf3;border-left-width:3px}
.fd-modal-hdr-meta{font-size:11px;color:#9aa3b0;margin-left:4px}
.fd-modal-budget-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border:1px solid #e8edf3;border-radius:9px;margin-bottom:4px;gap:12px;flex-wrap:wrap;transition:background .12s,box-shadow .15s;cursor:pointer}
.fd-modal-budget-hdr:hover{background:#f4f6fb;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.fd-modal-budget-hdr-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;flex:1}
.fd-modal-budget-hdr-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex-shrink:0}
.fd-modal-grant{font-size:13px;font-weight:700;color:#1a2e4a}
.fd-modal-ref{font-size:11px;color:#9aa3b0}
.fd-modal-chips{display:flex;gap:4px;flex-wrap:wrap}
.fd-modal-kpi{display:flex;flex-direction:column;align-items:flex-end;gap:1px}
.fd-modal-kpi-l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9aa3b0}
.fd-modal-kpi-v{font-size:13px;font-weight:700;color:#1a2e4a}
.fd-util-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:6px;white-space:nowrap}
.fd-bud-caret{font-size:10px;color:#9aa3b0;margin-right:4px;transition:transform .18s;display:inline-block;flex-shrink:0}
.fd-modal-budget-content{padding:2px 0 14px 0}

/* Tables */
.fd-tbl-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8892a4;margin-bottom:7px;display:flex;align-items:center;gap:6px}
.fd-tbl-scroll{overflow-x:auto;border:1px solid #d9dee6;border-radius:8px;margin-bottom:4px}
.fd-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;min-width:700px}
.fd-tbl thead tr{background:#1a4f8a}
.fd-tbl thead th{padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;border-right:1px solid rgba(255,255,255,.12);position:sticky;top:0;z-index:2}
.fd-tbl thead th:last-child{border-right:none}
.fd-tbl tbody tr{background:#fff;transition:background .1s}
.fd-tbl tbody tr:nth-child(even):not(.fdt-mo-sub){background:#f7f9fc}
.fd-tbl tbody tr:hover:not(.fdt-mo-sub){background:#eef3fb!important}
.fd-tbl tbody td{padding:8px 10px;color:#374151;border-right:1px solid #e8edf3;border-bottom:1px solid #e8edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.fd-tbl tbody tr:last-child td{border-bottom:none}
.fd-tbl tbody td:last-child{border-right:none}
.fd-tbl tfoot tr{background:#eef2f8}
.fdt-foot td{padding:8px 10px;border-right:1px solid #d9dee6;border-top:2px solid #c8d0db;font-size:12px;white-space:nowrap;color:#1a2e4a}
.fdt-foot td:last-child{border-right:none}
.fdt-num{text-align:center!important;width:36px;font-weight:600;font-size:10px;color:#9aa3b0}
.fdt-main{font-weight:600;color:#1a2e4a}
.fdt-muted{color:#9aa3b0;font-size:11px}
.fdt-r{text-align:right!important}
.fdt-center{text-align:center!important}
.fdt-curr{font-variant-numeric:tabular-nums}
.fdt-neg{color:#dc2626!important}
/* body highlight: light blue column band */
.fdt-hl{background:#eef4ff!important}
.fdt-foot .fdt-hl{background:#ddeafa!important}
/* card-accent column in body rows */
.fdt-accent-col{font-weight:700}
/* thead highlight: slightly lighter navy so it pops within the dark header */
.fd-tbl thead th.fdt-hl{background:#23629e!important;color:#fff!important}
/* card-accent header column: uses inline style background from hex, ensure text stays white */
.fd-tbl thead th.fdt-th-accent{color:#fff!important;font-weight:800!important}
.fdt-pct-wrap{display:flex;align-items:center;gap:5px;min-width:65px}
.fdt-pct-bar{height:4px;border-radius:2px;flex-shrink:0;min-width:2px;max-width:44px}
.fdt-mo-sub td{background:#f0f5fb!important;font-size:11px;border-bottom:1px solid #e4ecf7!important}
.fdt-mo-sub:last-child td{border-bottom:1px solid #e8edf3!important}

/* Pill labels */
.fd-pill-yes{display:inline-block;padding:2px 7px;border-radius:9px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d}
.fd-pill-no{display:inline-block;padding:2px 7px;border-radius:9px;font-size:10px;font-weight:700;background:#fef9c3;color:#854d0e}
.fd-chip{font-size:10px;background:#eef0f5;border:1px solid #e0e4ea;border-radius:4px;padding:2px 6px;color:#596270;font-weight:600}
.fd-nav-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block}

/* Summary number cards inside modal */
.fd-sum-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}
@media(max-width:900px){.fd-sum-cards{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.fd-sum-cards{grid-template-columns:repeat(2,1fr)}}
.fd-sum-card{background:#fff;border:1px solid #e4e8ef;border-radius:9px;padding:12px 14px}
.fd-sum-card-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9aa3b0;margin-bottom:4px}
.fd-sum-card-value{font-size:16px;font-weight:800;line-height:1.1;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fd-sum-card-sub{font-size:10px;color:#9aa3b0;margin-bottom:6px}
.fd-sum-card-bar-bg{height:3px;background:#eef0f5;border-radius:2px;overflow:hidden}
.fd-sum-card-bar{height:100%;border-radius:2px;transition:width .5s}

/* Table column widths */
.fdt-type{min-width:130px;max-width:180px}
.fdt-head{min-width:90px;max-width:130px}
.fdt-num-col{min-width:80px;white-space:nowrap}

/* Loading / error */
.fd-modal-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;color:#9aa3b0;font-size:13px;gap:12px}
.fd-modal-error{text-align:center;padding:40px;font-size:13px;color:#9aa3b0}
.fd-spinner{width:28px;height:28px;border:2.5px solid #e0e4ea;border-top-color:#1a4f8a;border-radius:50%;animation:fd-spin .7s linear infinite}
@keyframes fd-spin{to{transform:rotate(360deg)}}

/* Mobile */
@media(max-width:700px){
	#fd-modal{height:92vh;border-radius:14px 14px 0 0}
	#fd-modal-overlay{align-items:flex-end;padding:0}
	.fd-sum-cards{grid-template-columns:repeat(2,1fr)}
}
</style>`;}
}
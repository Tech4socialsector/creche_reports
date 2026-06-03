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





// frappe.pages['creche-finance-dashboard'].on_page_load = function (wrapper) {

// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Finance Dashboard',
// 		single_column: true,
// 	});

// 	/* ── API METHODS ───────────────────────────────────────── */
// 	var API = {
// 		filterOptions:   'creche_reports.api.dashboard.get_filter_options',
// 		dashboardData:   'creche_reports.api.dashboard.get_dashboard_data',
// 		drillData:       'creche_reports.api.dashboard.get_drill_data',
// 		lineItems:       'creche_reports.api.dashboard.get_line_items',
// 	};
// 	var USE_LIVE_API = true;   /* set false to force TEST_DB */

// 	/* ── TEST DATA ─────────────────────────────────────────── */
// 	var TEST_DB = {
// 		budgets: [
// 			{ name:'BGD-0001', partner_id:'CP-001', partner_name:'Asha Foundation',  grant_id:'GR-2024-001', financial_year:'2024-25', state:'Jharkhand',    district:'Ranchi',     block:'Angara',   no_of_creches:32, total_budget:1450000 },
// 			{ name:'BGD-0002', partner_id:'CP-002', partner_name:'Bal Kalyan Trust', grant_id:'GR-2024-002', financial_year:'2024-25', state:'Odisha',       district:'Sundargarh', block:'Chainpur', no_of_creches:28, total_budget:1280000 },
// 			{ name:'BGD-0003', partner_id:'CP-003', partner_name:'Seva Sangh',       grant_id:'GR-2025-001', financial_year:'2024-25', state:'Chhattisgarh', district:'Gumla',      block:'Silli',    no_of_creches:45, total_budget:1160000 },
// 			{ name:'BGD-0004', partner_id:'CP-004', partner_name:'Mamta Society',    grant_id:'GR-2024-001', financial_year:'2024-25', state:'Jharkhand',    district:'Khunti',     block:'Bero',     no_of_creches:37, total_budget: 930000 },
// 		],
// 		disbursements: [
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  grant:'GR-2024-001', ref:'BGD-0001', date:'12-Apr-2024', amount: 800000 },
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  grant:'GR-2024-001', ref:'BGD-0001', date:'10-Jul-2024', amount: 650000 },
// 			{ budget:'BGD-0002', partner_id:'CP-002', partner:'Bal Kalyan Trust', grant:'GR-2024-002', ref:'BGD-0002', date:'15-May-2024', amount: 720000 },
// 			{ budget:'BGD-0003', partner_id:'CP-003', partner:'Seva Sangh',       grant:'GR-2025-001', ref:'BGD-0003', date:'01-Jun-2024', amount: 580000 },
// 			{ budget:'BGD-0004', partner_id:'CP-004', partner:'Mamta Society',    grant:'GR-2024-001', ref:'BGD-0004', date:'20-Apr-2024', amount: 400000 },
// 		],
// 		utilisations: [
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  month:'June', state:'Jharkhand',    district:'Ranchi',     block:'Angara',   fy:'2024-25', main:'Programme', sub:'Staff costs',       type:'Creche worker salary',  amount:240000, bank_bal: 62000, interest:1200 },
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  month:'June', state:'Jharkhand',    district:'Ranchi',     block:'Angara',   fy:'2024-25', main:'Programme', sub:'Nutrition',         type:'Food & nutrition',      amount: 85000, bank_bal:     0, interest:   0 },
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  month:'May',  state:'Jharkhand',    district:'Ranchi',     block:'Angara',   fy:'2024-25', main:'Admin',     sub:'Office expenses',   type:'Stationery & printing', amount: 18000, bank_bal:     0, interest:   0 },
// 			{ budget:'BGD-0002', partner_id:'CP-002', partner:'Bal Kalyan Trust', month:'June', state:'Odisha',       district:'Sundargarh', block:'Chainpur', fy:'2024-25', main:'Admin',     sub:'Office expenses',   type:'Rent & utilities',      amount: 32000, bank_bal:110000, interest:2800 },
// 			{ budget:'BGD-0002', partner_id:'CP-002', partner:'Bal Kalyan Trust', month:'June', state:'Odisha',       district:'Sundargarh', block:'Chainpur', fy:'2024-25', main:'Programme', sub:'Capacity building', type:'Training',              amount: 55000, bank_bal:     0, interest:   0 },
// 			{ budget:'BGD-0003', partner_id:'CP-003', partner:'Seva Sangh',       month:'May',  state:'Chhattisgarh', district:'Gumla',      block:'Silli',    fy:'2024-25', main:'Programme', sub:'Staff costs',       type:'Supervisor salary',     amount:110000, bank_bal: 95000, interest:   0 },
// 			{ budget:'BGD-0004', partner_id:'CP-004', partner:'Mamta Society',    month:'June', state:'Jharkhand',    district:'Khunti',     block:'Bero',     fy:'2024-25', main:'Programme', sub:'Nutrition',         type:'Supplementary food',    amount: 72000, bank_bal:103000, interest:1650 },
// 		],
// 	};

// 	/* ── STYLES ────────────────────────────────────────────── */
// 	var css = [
// 		'/* Filter card */',
// 		'.cfd-filter-row {',
// 		'  display: flex; flex-wrap: wrap; gap: 14px 16px;',
// 		'  padding: 18px 20px;',
// 		'  background: var(--card-bg);',
// 		'  border: 1px solid var(--border-color);',
// 		'  border-radius: var(--border-radius-lg);',
// 		'  margin: 16px 20px 0;',
// 		'  box-shadow: 0 1px 3px rgba(0,0,0,0.06);',
// 		'  align-items: flex-end;',
// 		'}',
// 		'.cfd-filter-col { flex: 1 1 155px; max-width: 230px; min-width: 130px; }',
// 		'.cfd-filter-row .frappe-control { margin-bottom: 0 !important; }',
// 		'.cfd-filter-row .form-group { margin-bottom: 0 !important; }',
// 		'.cfd-filter-row .control-label { font-size:11px !important; font-weight:600 !important; color:var(--text-muted) !important; text-transform:uppercase; letter-spacing:0.07em; }',
// 		'/* Body */',
// 		'.cfd-body { padding: 16px 20px 28px; }',
// 		'/* Test badge */',
// 		'.cfd-test-badge { display:inline-flex; align-items:center; gap:5px; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:var(--border-radius); padding:3px 10px; font-size:11px; font-weight:600; margin-bottom:10px; }',
// 		'/* Summary strip */',
// 		'.cfd-strip { background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); display:flex; overflow:hidden; margin-bottom:12px; }',
// 		'.cfd-si { flex:1; padding:9px 12px; border-right:1px solid var(--border-color); cursor:pointer; transition:background 0.12s; position:relative; }',
// 		'.cfd-si:last-child { border-right:none; }',
// 		'.cfd-si:hover { background:var(--bg-color); }',
// 		'.cfd-si.active { background:var(--primary-light); }',
// 		'.cfd-si::after { content:""; position:absolute; bottom:0; left:0; right:0; height:2px; background:transparent; }',
// 		'.cfd-si.active::after { background:var(--primary); }',
// 		'.cfd-si-lbl { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.09em; margin-bottom:2px; white-space:nowrap; }',
// 		'.cfd-si-val { font-size:18px; font-weight:700; color:var(--text-color); line-height:1; }',
// 		'.cfd-si-sub { font-size:10px; color:var(--text-muted); margin-top:1px; }',
// 		'/* Section heading */',
// 		'.cfd-sec { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:5px; }',
// 		'/* Cards */',
// 		'.cfd-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-bottom:16px; }',
// 		'@media(max-width:960px){ .cfd-cards { grid-template-columns:repeat(2,1fr); } }',
// 		'@media(max-width:600px){ .cfd-cards { grid-template-columns:1fr; } }',
// 		'.cfd-kc { background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:11px 13px; cursor:pointer; transition:border-color 0.15s,box-shadow 0.15s; position:relative; overflow:hidden; }',
// 		'.cfd-kc:hover { border-color:var(--primary); box-shadow:0 2px 6px rgba(0,0,0,0.07); }',
// 		'.cfd-kc.active { border-color:var(--primary); box-shadow:0 0 0 2px var(--primary-light); }',
// 		'.cfd-kc-accent { position:absolute; top:0; left:0; right:0; height:3px; }',
// 		'.cfd-kc-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:7px; margin-top:4px; }',
// 		'.cfd-kc-icon { width:28px; height:28px; border-radius:var(--border-radius); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }',
// 		'.cfd-kc-badge { font-size:10px; font-weight:700; padding:1px 6px; border-radius:8px; align-self:flex-start; }',
// 		'.cfd-kc-lbl { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px; }',
// 		'.cfd-kc-val { font-size:19px; font-weight:700; color:var(--text-color); line-height:1; margin-bottom:2px; }',
// 		'.cfd-kc-sub { font-size:11px; color:var(--text-muted); }',
// 		'.cfd-kc-foot { display:flex; align-items:center; justify-content:space-between; margin-top:9px; padding-top:7px; border-top:1px solid var(--border-color); }',
// 		'.cfd-kc-flbl { font-size:10px; color:var(--text-extra-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:68%; }',
// 		'.cfd-kc-flink { font-size:10px; color:var(--primary); display:flex; align-items:center; gap:3px; white-space:nowrap; font-weight:600; }',
// 		'/* Drill panel */',
// 		'.cfd-drill { background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); overflow:hidden; margin-bottom:16px; }',
// 		'.cfd-dh { display:flex; align-items:center; justify-content:space-between; padding:10px 15px; background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }',
// 		'.cfd-dhl { display:flex; align-items:center; gap:9px; }',
// 		'.cfd-dht { font-size:13px; font-weight:700; color:#fff; }',
// 		'.cfd-dhs { font-size:10px; color:rgba(255,255,255,0.6); margin-top:1px; }',
// 		'.cfd-dcb { background:rgba(255,255,255,0.15); border:none; color:#fff; width:26px; height:26px; border-radius:5px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; }',
// 		'.cfd-dcb:hover { background:rgba(255,255,255,0.28); }',
// 		'.cfd-tscroll { overflow-x:auto; overflow-y:auto; max-height:340px; }',
// 		'.cfd-tbl { width:100%; border-collapse:separate; border-spacing:0; font-size:var(--text-sm); min-width:560px; }',
// 		'.cfd-tbl thead tr { background:#1a4f8a; }',
// 		'.cfd-tbl thead th { padding:8px 12px; text-align:left; font-size:10px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; border-right:1px solid rgba(255,255,255,0.15); position:sticky; top:0; z-index:2; background:#1a4f8a; }',
// 		'.cfd-tbl thead th:first-child { text-align:center; width:36px; }',
// 		'.cfd-tbl thead th:last-child { border-right:none; }',
// 		'.cfd-tbl tbody tr { background:#ffffff; }',
// 		'.cfd-tbl tbody tr:nth-child(even) { background:#f7f9fc; }',
// 		'.cfd-tbl tbody tr:hover { background:#e8f0fe !important; }',
// 		'.cfd-tbl tbody tr:hover td { color:#1a3a6b; }',
// 		'.cfd-tbl tbody tr.cfd-row-clickable { cursor:pointer; }',
// 		/* Grant ID grouping */
// 		/* ── Grant group header ── */
// 		'.cfd-grant-hdr { background:#1a3a6b !important; cursor:pointer; user-select:none; transition:background .15s,color .15s; }',
// 		'.cfd-grant-hdr > td { color:#fff !important; font-size:12px !important; font-weight:700 !important; padding:10px 13px !important; border-right:1px solid rgba(255,255,255,0.12) !important; border-bottom:2px solid rgba(255,255,255,0.1) !important; white-space:nowrap; vertical-align:middle; }',
// 		'.cfd-grant-hdr > td:last-child { border-right:none !important; }',
// 		'.cfd-grant-hdr:hover { background:#f0f4ff !important; }',
// 		'.cfd-grant-hdr:hover > td { color:#1a3a6b !important; border-right-color:var(--border-color) !important; }',
// 		'.cfd-grant-hdr:hover .cfd-grant-badge { background:#1a3a6b !important; color:#fff !important; }',
// 		'.cfd-grant-toggle { font-size:11px; margin-right:8px; display:inline-block; transition:transform .2s; vertical-align:middle; }',
// 		'.cfd-grant-hdr.collapsed .cfd-grant-toggle { transform:rotate(-90deg); }',
// 		/* Child rows */
// 		'.cfd-grant-child > td { padding-left:13px !important; }',
// 		'.cfd-grant-child > td:nth-child(2) { padding-left:26px !important; font-weight:600; }',
// 		'.cfd-grant-child.row-hidden { display:none; }',
// 		'.cfd-grant-child:hover > td { background:#f0f4ff !important; }',
// 		/* Grant badge */
// 		'.cfd-grant-badge { display:inline-flex; align-items:center; font-size:10px; font-weight:700; background:rgba(255,255,255,0.2); color:#fff; border-radius:20px; padding:1px 9px; margin-left:9px; vertical-align:middle; transition:background .15s,color .15s; }',
// 		/* Numeric cells right-aligned */
// 		'.cfd-grant-hdr .num { text-align:right !important; }',
// 		'.cfd-grant-child .num { text-align:right; }',
// 		/* ── Parent doctype detail strip ── */
// 		'.cfd-parent-strip { background:var(--bg-color); border-bottom:1px solid var(--border-color); padding:14px 16px; }',
// 		'.cfd-parent-strip-label { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; display:flex; align-items:center; gap:5px; margin-bottom:10px; }',
// 		'.cfd-parent-cards-row { display:flex; flex-wrap:wrap; gap:10px; }',
// 		'.cfd-parent-card { flex:1; min-width:260px; max-width:380px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:12px 14px; border-left:3px solid #1a4f8a; }',
// 		'.cfd-parent-card-head { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border-color); }',
// 		'.cfd-parent-card-name { font-size:13px; font-weight:700; color:var(--text-color); }',
// 		'.cfd-parent-card-ref { font-size:11px; font-weight:600; color:var(--primary); background:var(--primary-light); border-radius:4px; padding:1px 7px; white-space:nowrap; }',
// 		'.cfd-parent-card-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:8px 10px; margin-bottom:10px; }',
// 		'.cfd-parent-field-lbl { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; margin-bottom:2px; }',
// 		'.cfd-parent-field-val { font-size:12px; font-weight:600; color:var(--text-color); }',
// 		'.cfd-parent-card-bar-wrap { margin-top:4px; }',
// 		'.cfd-tbl tbody tr.cfd-row-clickable:hover td { color:var(--primary); font-weight:600; }',
// 		'.cfd-tbl tbody td { padding:8px 12px; font-size:var(--text-sm); color:var(--text-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color); white-space:nowrap; }',
// 		'.cfd-tbl tbody tr:last-child td { border-bottom:none; }',
// 		'.cfd-tbl tbody td:last-child { border-right:none; }',
// 		'.cfd-tdn { text-align:center; font-size:11px; color:var(--text-muted); }',
// 		'.cfd-tbold { font-weight:700; }',
// 		'.cfd-tbl tfoot tr td { background:#0b2e70 !important; color:#fff !important; font-weight:700 !important; padding:8px 12px; border-right:1px solid rgba(255,255,255,0.2); white-space:nowrap; font-size:var(--text-sm); }',
// 		'.cfd-tbl tfoot tr td:last-child { border-right:none; }',
// 		'/* Line item popup table */',
// 		'.cfd-li-tbl { width:100%; border-collapse:collapse; font-size:13px; }',
// 		'.cfd-li-tbl thead th { background:#1a4f8a; color:#fff; padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; }',
// 		'.cfd-li-tbl thead th:first-child { text-align:center; width:36px; }',
// 		'.cfd-li-tbl tbody tr:nth-child(even) { background:var(--bg-color); }',
// 		'.cfd-li-tbl tbody tr:hover { background:var(--primary-light); }',
// 		'.cfd-li-tbl tbody td { padding:8px 12px; border-bottom:1px solid var(--border-color); white-space:nowrap; font-size:13px; color:var(--text-color); }',
// 		'.cfd-li-tbl tbody tr:last-child td { border-bottom:none; }',
// 		'.cfd-li-tbl tfoot td { background:#0b2e70 !important; color:#fff !important; font-weight:700; padding:8px 12px; white-space:nowrap; }',
// 		'/* Dialog pills */',
// 		'.cfd-dlg-pill { display:inline-flex; align-items:center; border:1px solid var(--border-color); border-radius:var(--border-radius); overflow:hidden; font-size:12px; height:26px; background:var(--card-bg); margin:3px; }',
// 		'.cfd-dlg-pill-lbl { padding:0 7px; color:var(--text-muted); font-size:11px; font-weight:700; background:var(--bg-color); border-right:1px solid var(--border-color); height:100%; display:flex; align-items:center; text-transform:uppercase; letter-spacing:0.05em; }',
// 		'.cfd-dlg-pill-val { padding:0 8px; color:var(--text-color); font-size:12px; font-weight:500; height:100%; display:flex; align-items:center; }',
// 		'.cfd-dlg-pill-x { display:flex; align-items:center; justify-content:center; width:24px; height:100%; border:none; border-left:1px solid var(--border-color); background:transparent; cursor:pointer; color:var(--text-muted); padding:0; transition:background 0.12s,color 0.12s; flex-shrink:0; }',
// 		'.cfd-dlg-pill-x:hover { background:var(--red-light); color:var(--red); }',
// 		'.cfd-dlg-pills-wrap { display:flex; flex-wrap:wrap; padding:4px 0; min-height:36px; }',
// 		'.cfd-dlg-empty { color:var(--text-muted); font-size:13px; padding:8px 4px; }',
// 		/* View button */
// 		'.cfd-view-btn { display:inline-flex; align-items:center; justify-content:center; gap:3px; font-size:11px; font-weight:600; color:var(--primary); background:transparent; border:none; border-radius:4px; padding:4px 6px; cursor:pointer; white-space:nowrap; transition:background 0.12s,color 0.12s; line-height:1; }',
// 		'.cfd-view-btn:hover { background:var(--primary-light); color:var(--primary); }',
// 		/* Line item popup */
// 		'.cfd-li-wrap { font-family:var(--font-stack); }',
// 		/* Tabs */
// 		'.cfd-li-tabs { display:flex; gap:0; border-bottom:1px solid var(--border-color); margin-bottom:14px; padding:0 2px; }',
// 		'.cfd-li-tab { display:flex; align-items:center; gap:5px; padding:8px 14px; font-size:12px; font-weight:600; cursor:pointer; color:var(--text-muted); border-bottom:2px solid transparent; margin-bottom:-1px; transition:color 0.15s,border-color 0.15s; white-space:nowrap; }',
// 		'.cfd-li-tab:hover { color:var(--text-color); }',
// 		'.cfd-li-tab.active { color:var(--primary); border-bottom-color:var(--primary); }',
// 		'.cfd-li-tab .cfd-tab-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }',
// 		'.cfd-li-tab .cfd-tab-amt { font-size:10px; font-weight:500; color:var(--text-muted); margin-left:2px; }',
// 		'.cfd-li-tab.active .cfd-tab-amt { color:var(--primary); opacity:0.7; }',
// 		/* Summary bar */
// 		'.cfd-li-summary { display:flex; align-items:stretch; gap:0; margin-bottom:14px; border:1px solid var(--border-color); border-radius:var(--border-radius-lg); overflow:hidden; }',
// 		'.cfd-li-sum-item { flex:1; padding:12px 16px; border-right:1px solid var(--border-color); }',
// 		'.cfd-li-sum-item:last-child { border-right:none; }',
// 		'.cfd-li-sum-lbl { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px; }',
// 		'.cfd-li-sum-val { font-size:18px; font-weight:700; color:var(--text-color); line-height:1; }',
// 		'.cfd-li-sum-val.primary { color:var(--primary); }',
// 		/* Table wrapper */
// 		'.cfd-li-tbl-wrap { overflow-x:auto; overflow-y:auto; max-height:360px; border:1px solid var(--border-color); border-radius:var(--border-radius-lg); }',
// 		'.cfd-li-tbl2 { width:100%; border-collapse:separate; border-spacing:0; min-width:380px; }',
// 		'.cfd-li-tbl2 th { background:#1a4f8a; color:#fff; padding:8px 14px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; position:sticky; top:0; z-index:2; border-right:1px solid rgba(255,255,255,0.15); }',
// 		'.cfd-li-tbl2 th:last-child { text-align:right; border-right:none; }',
// 		'.cfd-li-tbl2 td { padding:0; border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color); white-space:nowrap; }',
// 		'.cfd-li-tbl2 tbody tr:last-child td { border-bottom:none; }',
// 		'.cfd-li-tbl2 td:last-child { border-right:none; text-align:right; }',
// 		/* Main head rows */
// 		'.cfd-li-head { }',
// 		'.cfd-li-head td { background:var(--bg-color) !important; }',
// 		'.cfd-li-head-cell { display:flex; align-items:center; gap:8px; padding:9px 14px; font-size:12px; font-weight:700; color:var(--text-color); }',
// 		'.cfd-li-head-bar { width:3px; height:16px; border-radius:2px; flex-shrink:0; }',
// 		'.cfd-li-head-amt { padding:9px 14px; font-size:12px; font-weight:700; text-align:right; }',
// 		/* Sub-head rows */
// 		'.cfd-li-sub td { background:var(--card-bg) !important; }',
// 		'.cfd-li-sub-cell { display:flex; align-items:center; gap:6px; padding:7px 14px 7px 28px; font-size:12px; font-weight:600; color:var(--text-muted); }',
// 		'.cfd-li-sub-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; opacity:0.6; }',
// 		'.cfd-li-sub-amt { padding:7px 14px; font-size:12px; font-weight:600; color:var(--text-muted); text-align:right; }',
// 		/* Line item rows */
// 		'.cfd-li-item td { background:var(--card-bg) !important; transition:background 0.1s; }',
// 		'.cfd-li-item:hover td { background:var(--primary-light) !important; }',
// 		'.cfd-li-item-cell { padding:6px 14px 6px 44px; font-size:12px; color:var(--text-color); }',
// 		'.cfd-li-item-amt { padding:6px 14px; font-size:12px; color:var(--text-color); text-align:right; }',
// 		/* Footer */
// 		'.cfd-li-tbl2 tfoot td { background:#0b2e70 !important; color:#fff !important; font-weight:700; padding:9px 14px; border:none; }',
// 		'.cfd-li-tbl2 tfoot td:last-child { text-align:right; }',
// 		/* ── Slide-in panel (from reference design) ── */
// 		'#cfd-panel-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9000; justify-content:flex-end; align-items:stretch; }',
// 		'#cfd-panel-overlay.open { display:flex; }',
// 		'#cfd-slide-panel { background:#f7f8fa; width:min(900px,100vw); display:flex; flex-direction:column; overflow:hidden; align-self:stretch; box-shadow:-8px 0 40px rgba(0,0,0,.18); animation:cfdPanelIn .28s cubic-bezier(.22,.68,0,1.15); }',
// 		'@keyframes cfdPanelIn { from{transform:translateX(80px);opacity:0} to{transform:translateX(0);opacity:1} }',
// 		'@keyframes cfdRowIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }',
// 		'@keyframes cfdTabSlide { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }',
// 		'@keyframes cfdPillPop { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }',
// 		/* Panel header */
// 		'#cfd-panel-header { display:flex; align-items:center; gap:14px; padding:0 20px; height:52px; flex-shrink:0; background:#1a4f8a; }',
// 		'#cfd-panel-close { background:rgba(255,255,255,.15); border:none; cursor:pointer; width:30px; height:30px; border-radius:7px; font-size:17px; color:#fff; display:flex; align-items:center; justify-content:center; transition:background .15s; flex-shrink:0; }',
// 		'#cfd-panel-close:hover { background:rgba(255,255,255,.28); }',
// 		'#cfd-panel-title { flex:1; font-size:14px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
// 		/* Sidebar (tabs + summary strip) */
// 		'#cfd-panel-sidebar { flex-shrink:0; background:#fff; border-bottom:1px solid #e4e8ef; }',
// 		'#cfd-panel-tab-bar { display:flex; align-items:center; overflow-x:auto; padding:0 14px; scrollbar-width:none; gap:0; animation:cfdTabSlide .22s ease .1s both; }',
// 		'#cfd-panel-tab-bar::-webkit-scrollbar { display:none; }',
// 		'.cfd-panel-tab { display:flex; align-items:center; gap:6px; padding:9px 13px; cursor:pointer; font-size:12px; font-weight:600; color:#666; border-bottom:2px solid transparent; white-space:nowrap; transition:color .15s,border-color .15s; flex-shrink:0; }',
// 		'.cfd-panel-tab:hover { color:#1a4f8a; }',
// 		'.cfd-panel-tab.active { color:#1a4f8a; border-bottom-color:#1a4f8a; }',
// 		'.cfd-panel-tab-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }',
// 		/* Summary strip */
// 		'#cfd-panel-strip { display:flex; align-items:center; gap:20px; padding:6px 14px 8px; background:#f7f9fc; border-top:1px solid #e8edf3; font-size:11px; }',
// 		'.cfd-panel-sum-lbl { font-size:9px; font-weight:700; letter-spacing:.5px; color:#aaa; text-transform:uppercase; }',
// 		'.cfd-panel-sum-val { font-size:14px; font-weight:700; color:#1a4f8a; }',
// 		/* Column header */
// 		'#cfd-panel-col-hdr { display:grid; background:#1a4f8a; font-size:10px; font-weight:700; color:#fff; letter-spacing:.3px; text-transform:uppercase; border-bottom:2px solid #134278; flex-shrink:0; }',
// 		'#cfd-panel-col-hdr > div { padding:9px 12px; border-right:1px solid rgba(255,255,255,.15); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
// 		'#cfd-panel-col-hdr > div:last-child { border-right:none; }',
// 		/* Scrollable rows */
// 		'#cfd-panel-rows { flex:1; overflow-y:auto; min-height:0; background:#f7f8fa; }',
// 		/* Section header row */
// 		'.cfd-panel-sec { display:grid; background:#eaf3fb; border-top:2px solid #1a4f8a; border-bottom:1px solid #c8dff0; cursor:pointer; user-select:none; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.3px; color:#1a4f8a; animation:cfdRowIn .14s ease both; }',
// 		'.cfd-panel-sec > div { padding:9px 12px; border-right:1px solid #c8dff0; }',
// 		'.cfd-panel-sec > div:last-child { border-right:none; }',
// 		'.cfd-panel-sec-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; display:inline-block; margin-right:7px; }',
// 		'.cfd-panel-sec-toggle { font-size:10px; color:#1a4f8a; transition:transform .2s; display:inline-block; margin-left:auto; flex-shrink:0; }',
// 		'.cfd-panel-sec.collapsed .cfd-panel-sec-toggle { transform:rotate(-90deg); }',
// 		/* Sub-head row */
// 		'.cfd-panel-sub { display:grid; background:#f4f6f9; border-bottom:1px solid #d8e2ec; cursor:pointer; animation:cfdRowIn .14s ease both; }',
// 		'.cfd-panel-sub > div { padding:8px 12px; border-right:1px solid #e8edf3; font-size:12px; font-weight:700; color:#1a2a3a; display:flex; align-items:center; justify-content:flex-end; }',
// 		'.cfd-panel-sub > div:first-child { justify-content:flex-start; padding-left:22px; }',
// 		'.cfd-panel-sub > div:last-child { border-right:none; }',
// 		'.cfd-panel-sub:hover > div { background:#deeaf5; }',
// 		/* Line item row */
// 		'.cfd-panel-item { display:grid; border-bottom:1px solid #e8edf3; animation:cfdRowIn .14s ease both; transition:background .12s; }',
// 		'.cfd-panel-item > div { padding:7px 12px; border-right:1px solid #e8edf3; font-size:12px; color:#333; display:flex; align-items:center; justify-content:flex-end; }',
// 		'.cfd-panel-item > div:first-child { justify-content:flex-start; padding-left:32px; color:#444; }',
// 		'.cfd-panel-item > div:last-child { border-right:none; }',
// 		'.cfd-panel-item:hover > div { background:#f0f5fb; }',
// 		'.cfd-panel-item.row-hidden { display:none; }',
// 		/* Total row */
// 		'.cfd-panel-total { display:grid; background:#0b2e70 !important; border-top:2px solid #002a47; position:sticky; bottom:0; z-index:5; animation:cfdRowIn .2s ease both; }',
// 		'.cfd-panel-total > div { padding:9px 12px; border-right:1px solid rgba(255,255,255,.15); font-size:12px; font-weight:700; color:#fff; display:flex; align-items:center; justify-content:flex-end; }',
// 		'.cfd-panel-total > div:first-child { justify-content:flex-start; }',
// 		'.cfd-panel-total > div:last-child { border-right:none; }',
// 		/* Util pill */
// 		'.cfd-panel-pill { display:inline-block; padding:2px 7px; border-radius:9px; font-size:10px; font-weight:700; white-space:nowrap; animation:cfdPillPop .25s ease both; }',
// 	].join('\n');

// 	$('<style>' + css + '</style>').appendTo('head');
// 	/* ── TEST DATA ─────────────────────────────────────────── */
// 	var TEST_DB = {
// 		budgets: [
// 			{ name:'BGD-0001', partner_id:'CP-001', partner_name:'Asha Foundation',  grant_id:'GR-2024-001', financial_year:'2024-25', state:'Jharkhand',    district:'Ranchi',     block:'Angara',   no_of_creches:32, total_budget:1450000 },
// 			{ name:'BGD-0002', partner_id:'CP-002', partner_name:'Bal Kalyan Trust', grant_id:'GR-2024-002', financial_year:'2024-25', state:'Odisha',       district:'Sundargarh', block:'Chainpur', no_of_creches:28, total_budget:1280000 },
// 			{ name:'BGD-0003', partner_id:'CP-003', partner_name:'Seva Sangh',       grant_id:'GR-2025-001', financial_year:'2024-25', state:'Chhattisgarh', district:'Gumla',      block:'Silli',    no_of_creches:45, total_budget:1160000 },
// 			{ name:'BGD-0004', partner_id:'CP-004', partner_name:'Mamta Society',    grant_id:'GR-2024-001', financial_year:'2024-25', state:'Jharkhand',    district:'Khunti',     block:'Bero',     no_of_creches:37, total_budget: 930000 },
// 		],
// 		disbursements: [
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  grant:'GR-2024-001', ref:'BGD-0001', date:'12-Apr-2024', amount: 800000 },
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  grant:'GR-2024-001', ref:'BGD-0001', date:'10-Jul-2024', amount: 650000 },
// 			{ budget:'BGD-0002', partner_id:'CP-002', partner:'Bal Kalyan Trust', grant:'GR-2024-002', ref:'BGD-0002', date:'15-May-2024', amount: 720000 },
// 			{ budget:'BGD-0003', partner_id:'CP-003', partner:'Seva Sangh',       grant:'GR-2025-001', ref:'BGD-0003', date:'01-Jun-2024', amount: 580000 },
// 			{ budget:'BGD-0004', partner_id:'CP-004', partner:'Mamta Society',    grant:'GR-2024-001', ref:'BGD-0004', date:'20-Apr-2024', amount: 400000 },
// 		],
// 		utilisations: [
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  month:'June', state:'Jharkhand',    district:'Ranchi',     block:'Angara',   fy:'2024-25', main:'Programme', sub:'Staff costs',       type:'Creche worker salary',  amount:240000, bank_bal: 62000, interest:1200 },
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  month:'June', state:'Jharkhand',    district:'Ranchi',     block:'Angara',   fy:'2024-25', main:'Programme', sub:'Nutrition',         type:'Food & nutrition',      amount: 85000, bank_bal:     0, interest:   0 },
// 			{ budget:'BGD-0001', partner_id:'CP-001', partner:'Asha Foundation',  month:'May',  state:'Jharkhand',    district:'Ranchi',     block:'Angara',   fy:'2024-25', main:'Admin',     sub:'Office expenses',   type:'Stationery & printing', amount: 18000, bank_bal:     0, interest:   0 },
// 			{ budget:'BGD-0002', partner_id:'CP-002', partner:'Bal Kalyan Trust', month:'June', state:'Odisha',       district:'Sundargarh', block:'Chainpur', fy:'2024-25', main:'Admin',     sub:'Office expenses',   type:'Rent & utilities',      amount: 32000, bank_bal:110000, interest:2800 },
// 			{ budget:'BGD-0002', partner_id:'CP-002', partner:'Bal Kalyan Trust', month:'June', state:'Odisha',       district:'Sundargarh', block:'Chainpur', fy:'2024-25', main:'Programme', sub:'Capacity building', type:'Training',              amount: 55000, bank_bal:     0, interest:   0 },
// 			{ budget:'BGD-0003', partner_id:'CP-003', partner:'Seva Sangh',       month:'May',  state:'Chhattisgarh', district:'Gumla',      block:'Silli',    fy:'2024-25', main:'Programme', sub:'Staff costs',       type:'Supervisor salary',     amount:110000, bank_bal: 95000, interest:   0 },
// 			{ budget:'BGD-0004', partner_id:'CP-004', partner:'Mamta Society',    month:'June', state:'Jharkhand',    district:'Khunti',     block:'Bero',     fy:'2024-25', main:'Programme', sub:'Nutrition',         type:'Supplementary food',    amount: 72000, bank_bal:103000, interest:1650 },
// 		],
// 	};

// 	/* ── STYLES ────────────────────────────────────────────── */
// 	var css = [
// 		'/* Filter card */',
// 		'.cfd-filter-row {',
// 		'  display: flex; flex-wrap: wrap; gap: 14px 16px;',
// 		'  padding: 18px 20px;',
// 		'  background: var(--card-bg);',
// 		'  border: 1px solid var(--border-color);',
// 		'  border-radius: var(--border-radius-lg);',
// 		'  margin: 16px 20px 0;',
// 		'  box-shadow: 0 1px 3px rgba(0,0,0,0.06);',
// 		'  align-items: flex-end;',
// 		'}',
// 		'.cfd-filter-col { flex: 1 1 155px; max-width: 230px; min-width: 130px; }',
// 		'.cfd-filter-row .frappe-control { margin-bottom: 0 !important; }',
// 		'.cfd-filter-row .form-group { margin-bottom: 0 !important; }',
// 		'.cfd-filter-row .control-label { font-size:11px !important; font-weight:600 !important; color:var(--text-muted) !important; text-transform:uppercase; letter-spacing:0.07em; }',
// 		'/* Body */',
// 		'.cfd-body { padding: 16px 20px 28px; }',
// 		'/* Test badge */',
// 		'.cfd-test-badge { display:inline-flex; align-items:center; gap:5px; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:var(--border-radius); padding:3px 10px; font-size:11px; font-weight:600; margin-bottom:10px; }',
// 		'/* Summary strip */',
// 		'.cfd-strip { background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); display:flex; overflow:hidden; margin-bottom:12px; }',
// 		'.cfd-si { flex:1; padding:9px 12px; border-right:1px solid var(--border-color); cursor:pointer; transition:background 0.12s; position:relative; }',
// 		'.cfd-si:last-child { border-right:none; }',
// 		'.cfd-si:hover { background:var(--bg-color); }',
// 		'.cfd-si.active { background:var(--primary-light); }',
// 		'.cfd-si::after { content:""; position:absolute; bottom:0; left:0; right:0; height:2px; background:transparent; }',
// 		'.cfd-si.active::after { background:var(--primary); }',
// 		'.cfd-si-lbl { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.09em; margin-bottom:2px; white-space:nowrap; }',
// 		'.cfd-si-val { font-size:18px; font-weight:700; color:var(--text-color); line-height:1; }',
// 		'.cfd-si-sub { font-size:10px; color:var(--text-muted); margin-top:1px; }',
// 		'/* Section heading */',
// 		'.cfd-sec { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:5px; }',
// 		'/* Cards */',
// 		'.cfd-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-bottom:16px; }',
// 		'@media(max-width:960px){ .cfd-cards { grid-template-columns:repeat(2,1fr); } }',
// 		'@media(max-width:600px){ .cfd-cards { grid-template-columns:1fr; } }',
// 		'.cfd-kc { background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:11px 13px; cursor:pointer; transition:border-color 0.15s,box-shadow 0.15s; position:relative; overflow:hidden; }',
// 		'.cfd-kc:hover { border-color:var(--primary); box-shadow:0 2px 6px rgba(0,0,0,0.07); }',
// 		'.cfd-kc.active { border-color:var(--primary); box-shadow:0 0 0 2px var(--primary-light); }',
// 		'.cfd-kc-accent { position:absolute; top:0; left:0; right:0; height:3px; }',
// 		'.cfd-kc-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:7px; margin-top:4px; }',
// 		'.cfd-kc-icon { width:28px; height:28px; border-radius:var(--border-radius); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }',
// 		'.cfd-kc-badge { font-size:10px; font-weight:700; padding:1px 6px; border-radius:8px; align-self:flex-start; }',
// 		'.cfd-kc-lbl { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px; }',
// 		'.cfd-kc-val { font-size:19px; font-weight:700; color:var(--text-color); line-height:1; margin-bottom:2px; }',
// 		'.cfd-kc-sub { font-size:11px; color:var(--text-muted); }',
// 		'.cfd-kc-foot { display:flex; align-items:center; justify-content:space-between; margin-top:9px; padding-top:7px; border-top:1px solid var(--border-color); }',
// 		'.cfd-kc-flbl { font-size:10px; color:var(--text-extra-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:68%; }',
// 		'.cfd-kc-flink { font-size:10px; color:var(--primary); display:flex; align-items:center; gap:3px; white-space:nowrap; font-weight:600; }',
// 		'/* Drill panel */',
// 		'.cfd-drill { background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); overflow:hidden; margin-bottom:16px; }',
// 		'.cfd-dh { display:flex; align-items:center; justify-content:space-between; padding:10px 15px; background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }',
// 		'.cfd-dhl { display:flex; align-items:center; gap:9px; }',
// 		'.cfd-dht { font-size:13px; font-weight:700; color:#fff; }',
// 		'.cfd-dhs { font-size:10px; color:rgba(255,255,255,0.6); margin-top:1px; }',
// 		'.cfd-dcb { background:rgba(255,255,255,0.15); border:none; color:#fff; width:26px; height:26px; border-radius:5px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; }',
// 		'.cfd-dcb:hover { background:rgba(255,255,255,0.28); }',
// 		'.cfd-tscroll { overflow-x:auto; overflow-y:auto; max-height:340px; }',
// 		'.cfd-tbl { width:100%; border-collapse:separate; border-spacing:0; font-size:var(--text-sm); min-width:560px; }',
// 		'.cfd-tbl thead tr { background:#1a4f8a; }',
// 		'.cfd-tbl thead th { padding:8px 12px; text-align:left; font-size:10px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; border-right:1px solid rgba(255,255,255,0.15); position:sticky; top:0; z-index:2; background:#1a4f8a; }',
// 		'.cfd-tbl thead th:first-child { text-align:center; width:36px; }',
// 		'.cfd-tbl thead th:last-child { border-right:none; }',
// 		'.cfd-tbl tbody tr { background:#ffffff; }',
// 		'.cfd-tbl tbody tr:nth-child(even) { background:#f7f9fc; }',
// 		'.cfd-tbl tbody tr:hover { background:#e8f0fe !important; }',
// 		'.cfd-tbl tbody tr:hover td { color:#1a3a6b; }',
// 		'.cfd-tbl tbody tr.cfd-row-clickable { cursor:pointer; }',
// 		/* Grant ID grouping */
// 		/* ── Grant group header ── */
// 		'.cfd-grant-hdr { background:#1a3a6b !important; cursor:pointer; user-select:none; transition:background .15s,color .15s; }',
// 		'.cfd-grant-hdr > td { color:#fff !important; font-size:12px !important; font-weight:700 !important; padding:10px 13px !important; border-right:1px solid rgba(255,255,255,0.12) !important; border-bottom:2px solid rgba(255,255,255,0.1) !important; white-space:nowrap; vertical-align:middle; }',
// 		'.cfd-grant-hdr > td:last-child { border-right:none !important; }',
// 		'.cfd-grant-hdr:hover { background:#f0f4ff !important; }',
// 		'.cfd-grant-hdr:hover > td { color:#1a3a6b !important; border-right-color:var(--border-color) !important; }',
// 		'.cfd-grant-hdr:hover .cfd-grant-badge { background:#1a3a6b !important; color:#fff !important; }',
// 		'.cfd-grant-toggle { font-size:11px; margin-right:8px; display:inline-block; transition:transform .2s; vertical-align:middle; }',
// 		'.cfd-grant-hdr.collapsed .cfd-grant-toggle { transform:rotate(-90deg); }',
// 		/* Child rows */
// 		'.cfd-grant-child > td { padding-left:13px !important; }',
// 		'.cfd-grant-child > td:nth-child(2) { padding-left:26px !important; font-weight:600; }',
// 		'.cfd-grant-child.row-hidden { display:none; }',
// 		'.cfd-grant-child:hover > td { background:#f0f4ff !important; }',
// 		/* Grant badge */
// 		'.cfd-grant-badge { display:inline-flex; align-items:center; font-size:10px; font-weight:700; background:rgba(255,255,255,0.2); color:#fff; border-radius:20px; padding:1px 9px; margin-left:9px; vertical-align:middle; transition:background .15s,color .15s; }',
// 		/* Numeric cells right-aligned */
// 		'.cfd-grant-hdr .num { text-align:right !important; }',
// 		'.cfd-grant-child .num { text-align:right; }',
// 		/* ── Parent doctype detail strip ── */
// 		'.cfd-parent-strip { background:var(--bg-color); border-bottom:1px solid var(--border-color); padding:14px 16px; }',
// 		'.cfd-parent-strip-label { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; display:flex; align-items:center; gap:5px; margin-bottom:10px; }',
// 		'.cfd-parent-cards-row { display:flex; flex-wrap:wrap; gap:10px; }',
// 		'.cfd-parent-card { flex:1; min-width:260px; max-width:380px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:12px 14px; border-left:3px solid #1a4f8a; }',
// 		'.cfd-parent-card-head { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border-color); }',
// 		'.cfd-parent-card-name { font-size:13px; font-weight:700; color:var(--text-color); }',
// 		'.cfd-parent-card-ref { font-size:11px; font-weight:600; color:var(--primary); background:var(--primary-light); border-radius:4px; padding:1px 7px; white-space:nowrap; }',
// 		'.cfd-parent-card-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:8px 10px; margin-bottom:10px; }',
// 		'.cfd-parent-field-lbl { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; margin-bottom:2px; }',
// 		'.cfd-parent-field-val { font-size:12px; font-weight:600; color:var(--text-color); }',
// 		'.cfd-parent-card-bar-wrap { margin-top:4px; }',
// 		'.cfd-tbl tbody tr.cfd-row-clickable:hover td { color:var(--primary); font-weight:600; }',
// 		'.cfd-tbl tbody td { padding:8px 12px; font-size:var(--text-sm); color:var(--text-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color); white-space:nowrap; }',
// 		'.cfd-tbl tbody tr:last-child td { border-bottom:none; }',
// 		'.cfd-tbl tbody td:last-child { border-right:none; }',
// 		'.cfd-tdn { text-align:center; font-size:11px; color:var(--text-muted); }',
// 		'.cfd-tbold { font-weight:700; }',
// 		'.cfd-tbl tfoot tr td { background:#0b2e70 !important; color:#fff !important; font-weight:700 !important; padding:8px 12px; border-right:1px solid rgba(255,255,255,0.2); white-space:nowrap; font-size:var(--text-sm); }',
// 		'.cfd-tbl tfoot tr td:last-child { border-right:none; }',
// 		'/* Line item popup table */',
// 		'.cfd-li-tbl { width:100%; border-collapse:collapse; font-size:13px; }',
// 		'.cfd-li-tbl thead th { background:#1a4f8a; color:#fff; padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; }',
// 		'.cfd-li-tbl thead th:first-child { text-align:center; width:36px; }',
// 		'.cfd-li-tbl tbody tr:nth-child(even) { background:var(--bg-color); }',
// 		'.cfd-li-tbl tbody tr:hover { background:var(--primary-light); }',
// 		'.cfd-li-tbl tbody td { padding:8px 12px; border-bottom:1px solid var(--border-color); white-space:nowrap; font-size:13px; color:var(--text-color); }',
// 		'.cfd-li-tbl tbody tr:last-child td { border-bottom:none; }',
// 		'.cfd-li-tbl tfoot td { background:#0b2e70 !important; color:#fff !important; font-weight:700; padding:8px 12px; white-space:nowrap; }',
// 		'/* Dialog pills */',
// 		'.cfd-dlg-pill { display:inline-flex; align-items:center; border:1px solid var(--border-color); border-radius:var(--border-radius); overflow:hidden; font-size:12px; height:26px; background:var(--card-bg); margin:3px; }',
// 		'.cfd-dlg-pill-lbl { padding:0 7px; color:var(--text-muted); font-size:11px; font-weight:700; background:var(--bg-color); border-right:1px solid var(--border-color); height:100%; display:flex; align-items:center; text-transform:uppercase; letter-spacing:0.05em; }',
// 		'.cfd-dlg-pill-val { padding:0 8px; color:var(--text-color); font-size:12px; font-weight:500; height:100%; display:flex; align-items:center; }',
// 		'.cfd-dlg-pill-x { display:flex; align-items:center; justify-content:center; width:24px; height:100%; border:none; border-left:1px solid var(--border-color); background:transparent; cursor:pointer; color:var(--text-muted); padding:0; transition:background 0.12s,color 0.12s; flex-shrink:0; }',
// 		'.cfd-dlg-pill-x:hover { background:var(--red-light); color:var(--red); }',
// 		'.cfd-dlg-pills-wrap { display:flex; flex-wrap:wrap; padding:4px 0; min-height:36px; }',
// 		'.cfd-dlg-empty { color:var(--text-muted); font-size:13px; padding:8px 4px; }',
// 		/* View button */
// 		'.cfd-view-btn { display:inline-flex; align-items:center; justify-content:center; gap:3px; font-size:11px; font-weight:600; color:var(--primary); background:transparent; border:none; border-radius:4px; padding:4px 6px; cursor:pointer; white-space:nowrap; transition:background 0.12s,color 0.12s; line-height:1; }',
// 		'.cfd-view-btn:hover { background:var(--primary-light); color:var(--primary); }',
// 		/* Line item popup */
// 		'.cfd-li-tabs { display:flex; gap:0; border-bottom:2px solid var(--border-color); margin-bottom:12px; }',
// 		'.cfd-li-tab { padding:7px 16px; font-size:12px; font-weight:600; cursor:pointer; color:var(--text-muted); border-bottom:2px solid transparent; margin-bottom:-2px; transition:color 0.15s,border-color 0.15s; }',
// 		'.cfd-li-tab.active { color:var(--primary); border-bottom-color:var(--primary); }',
// 		'.cfd-li-total-bar { display:flex; align-items:baseline; gap:8px; margin-bottom:12px; padding:10px 14px; background:var(--bg-color); border-radius:var(--border-radius); border:1px solid var(--border-color); }',
// 		'.cfd-li-total-lbl { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; }',
// 		'.cfd-li-total-val { font-size:22px; font-weight:700; color:var(--text-color); }',
// 		'.cfd-li-tbl-wrap { overflow-x:auto; overflow-y:auto; max-height:400px; }',
// 		'.cfd-li-tbl2 { width:100%; border-collapse:collapse; min-width:400px; }',
// 		'.cfd-li-tbl2 th { background:#1a4f8a; color:#fff; padding:8px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; position:sticky; top:0; z-index:2; }',
// 		'.cfd-li-tbl2 th:last-child { text-align:right; }',
// 		'.cfd-li-tbl2 td { padding:8px 12px; border-bottom:1px solid var(--border-color); font-size:13px; color:var(--text-color); white-space:nowrap; }',
// 		'.cfd-li-tbl2 td:last-child { text-align:right; font-weight:600; }',
// 		'.cfd-li-tbl2 tbody tr:hover td { background:var(--primary-light); }',
// 		'.cfd-li-tbl2 tbody tr:last-child td { border-bottom:none; }',
// 		/* Head group row */
// 		'.cfd-li-head { background:var(--light) !important; cursor:pointer; }',
// 		'.cfd-li-head td { font-weight:700 !important; font-size:12px !important; color:var(--text-color) !important; border-top:2px solid var(--border-color); }',
// 		'.cfd-li-head td:first-child { padding-left:12px !important; }',
// 		'.cfd-li-head-accent { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:8px; flex-shrink:0; }',
// 		/* Sub-head group row */
// 		'.cfd-li-sub { background:var(--bg-color) !important; }',
// 		'.cfd-li-sub td { font-weight:600 !important; font-size:12px !important; color:var(--text-muted) !important; }',
// 		'.cfd-li-sub td:first-child { padding-left:24px !important; }',
// 		/* Line item row */
// 		'.cfd-li-item td:first-child { padding-left:36px !important; font-size:12px !important; }',
// 		/* Footer */
// 		'.cfd-li-tbl2 tfoot td { background:#0b2e70 !important; color:#fff !important; font-weight:700 !important; padding:9px 12px; border:none; }',
// 		/* View line items button in drill table */
// 		'.cfd-view-btn { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:var(--primary); background:var(--primary-light); border:1px solid var(--primary); border-radius:4px; padding:2px 8px; cursor:pointer; white-space:nowrap; transition:background 0.12s; }',
// 		'.cfd-view-btn:hover { background:var(--primary); color:#fff; }',
// 		/* Line item popup layout */
// 		'.cfd-li-wrap { display:flex; flex-direction:column; height:100%; }',
// 		'.cfd-li-tabs { display:flex; gap:0; border-bottom:2px solid var(--border-color); margin-bottom:14px; }',
// 		'.cfd-li-tab { padding:7px 16px; font-size:12px; font-weight:600; cursor:pointer; color:var(--text-muted); border-bottom:2px solid transparent; margin-bottom:-2px; transition:color 0.15s,border-color 0.15s; }',
// 		'.cfd-li-tab:hover { color:var(--text-color); }',
// 		'.cfd-li-tab.active { color:var(--primary); border-bottom-color:var(--primary); }',
// 		'.cfd-li-total-bar { display:flex; align-items:baseline; gap:6px; margin-bottom:14px; padding:10px 14px; background:var(--bg-color); border-radius:var(--border-radius); border:1px solid var(--border-color); }',
// 		'.cfd-li-total-lbl { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; }',
// 		'.cfd-li-total-val { font-size:22px; font-weight:700; color:var(--text-color); }',
// 		'.cfd-li-table-wrap { overflow-x:auto; overflow-y:auto; max-height:400px; }',
// 		'.cfd-li-head-row { background:var(--primary) !important; cursor:pointer; }',
// 		'.cfd-li-head-row td { color:#fff !important; font-weight:700 !important; font-size:12px !important; padding:9px 12px !important; }',
// 		'.cfd-li-head-row td:first-child { padding-left:14px !important; }',
// 		'.cfd-li-head-row .cfd-li-toggle { font-size:11px; margin-right:6px; transition:transform 0.15s; display:inline-block; }',
// 		'.cfd-li-head-row.collapsed .cfd-li-toggle { transform:rotate(-90deg); }',
// 		'.cfd-li-item-row td { padding-left:32px !important; font-size:12px !important; color:var(--text-color) !important; }',
// 		'.cfd-li-item-row:hover td { background:var(--primary-light) !important; }',
// 		'.cfd-li-sub-row td { background:var(--bg-color) !important; font-size:12px !important; }',
// 		'.cfd-li-tbl2 { width:100%; border-collapse:collapse; min-width:400px; }',
// 		'.cfd-li-tbl2 th { background:#1a4f8a; color:#fff; padding:8px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; position:sticky; top:0; z-index:2; }',
// 		'.cfd-li-tbl2 th:last-child { text-align:right; }',
// 		'.cfd-li-tbl2 td:last-child { text-align:right; }',
// 		'.cfd-li-tbl2 tfoot td { background:#0b2e70 !important; color:#fff !important; font-weight:700; padding:9px 12px; }',
// 	].join('\n');

// 	$('<style>' + css + '</style>').appendTo('head');

// 	/* ── HELPERS ───────────────────────────────────────────── */
// 	function inr(v) {
// 		v = parseFloat(v) || 0;
// 		var s = Math.round(v).toString(), r = '';
// 		if (s.length > 3) {
// 			r = ',' + s.slice(-3); s = s.slice(0, -3);
// 			while (s.length > 2) { r = ',' + s.slice(-2) + r; s = s.slice(0, -2); }
// 			r = s + r;
// 		} else { r = s; }
// 		return '\u20B9' + r;
// 	}
// 	function pctStr(a, b) { return b ? ((a / b) * 100).toFixed(1) + '%' : '0%'; }
// 	function unique(arr) { return arr.filter(function(v, i, s) { return s.indexOf(v) === i; }); }

// 	/* ── FILTER CONTROLS ───────────────────────────────────── */
// 	/* ── Slide-in panel DOM ── */
// 	$(page.body).append(
// 		'<div id="cfd-panel-overlay">' +
// 		'  <div id="cfd-slide-panel">' +
// 		'    <div id="cfd-panel-header">' +
// 		'      <button id="cfd-panel-close">&#215;</button>' +
// 		'      <div id="cfd-panel-title">Line Items</div>' +
// 		'    </div>' +
// 		'    <div id="cfd-panel-sidebar">' +
// 		'      <div id="cfd-panel-tab-bar"></div>' +
// 		'      <div id="cfd-panel-strip"></div>' +
// 		'    </div>' +
// 		'    <div id="cfd-panel-col-hdr"></div>' +
// 		'    <div id="cfd-panel-rows"></div>' +
// 		'  </div>' +
// 		'</div>'
// 	);

// 	/* Close panel */
// 	$(document).on('click', '#cfd-panel-close', function() {
// 		$('#cfd-panel-overlay').removeClass('open');
// 	});
// 	$(document).on('click', '#cfd-panel-overlay', function(e) {
// 		if (e.target === this) $('#cfd-panel-overlay').removeClass('open');
// 	});

// 	var $filter_row = $('<div class="cfd-filter-row"></div>').appendTo(page.body);
// 	function makeCol() { return $('<div class="cfd-filter-col"></div>').appendTo($filter_row); }

// 	var fy_ctrl = frappe.ui.form.make_control({
// 		parent: makeCol(),
// 		df: { label:'Financial Year', fieldtype:'Select', fieldname:'financial_year',
// 			  options: ['2022-23','2023-24','2024-25','2025-26'].join('\n'),
// 			  change: function() {
// 				  loadFilterOptions();
// 				  loadData();
// 			  } },
// 		render_input: true,
// 	});
// 	fy_ctrl.refresh();

// 	var month_ctrl = frappe.ui.form.make_control({
// 		parent: makeCol(),
// 		df: { label:'Month', fieldtype:'MultiSelectList', fieldname:'month',
// 			  get_data: function() { return _filterOpts.months || []; },
// 			  change: function() { updateFilterBtn(); loadData(); } },
// 		render_input: true,
// 	}); month_ctrl.refresh();

// 	var partner_ctrl = frappe.ui.form.make_control({
// 		parent: makeCol(),
// 		df: { label:'Partner', fieldtype:'MultiSelectList', fieldname:'partner_id',
// 			  get_data: function() { return _filterOpts.partners || []; },
// 			  change: function() { updateFilterBtn(); loadData(); } },
// 		render_input: true,
// 	}); partner_ctrl.refresh();

// 	var grant_ctrl = frappe.ui.form.make_control({
// 		parent: makeCol(),
// 		df: { label:'Grant ID', fieldtype:'MultiSelectList', fieldname:'grant_id',
// 			  get_data: function() { return _filterOpts.grant_ids || []; },
// 			  change: function() { updateFilterBtn(); loadData(); } },
// 		render_input: true,
// 	}); grant_ctrl.refresh();

// 	var state_ctrl = frappe.ui.form.make_control({
// 		parent: makeCol(),
// 		df: { label:'State', fieldtype:'MultiSelectList', fieldname:'state',
// 			  get_data: function() { return _filterOpts.states || []; },
// 			  change: function() { updateFilterBtn(); loadData(); } },
// 		render_input: true,
// 	}); state_ctrl.refresh();

// 	var district_ctrl = frappe.ui.form.make_control({
// 		parent: makeCol(),
// 		df: { label:'District', fieldtype:'MultiSelectList', fieldname:'district',
// 			  get_data: function() { return _filterOpts.districts || []; },
// 			  change: function() { updateFilterBtn(); loadData(); } },
// 		render_input: true,
// 	}); district_ctrl.refresh();

// 	var block_ctrl = frappe.ui.form.make_control({
// 		parent: makeCol(),
// 		df: { label:'Block', fieldtype:'MultiSelectList', fieldname:'block',
// 			  get_data: function() { return _filterOpts.blocks || []; },
// 			  change: function() { updateFilterBtn(); loadData(); } },
// 		render_input: true,
// 	}); block_ctrl.refresh();

// 	/* ── Live filter options cache ── */
// 	var _filterOpts = { months:[], partners:[], grant_ids:[], states:[], districts:[], blocks:[] };

// 	function loadFilterOptions() {
// 		if (!USE_LIVE_API) return;
// 		var fy = fy_ctrl.get_value();
// 		frappe.call({
// 			method: API.filterOptions,
// 			args: { financial_year: fy || '' },
// 			callback: function(r) {
// 				console.log('[CFD] get_filter_options response:', r.message);
// 				if (!r.message) return;
// 				_filterOpts = r.message;
// 				/* Set FY select options */
// 				if (r.message.financial_years && r.message.financial_years.length) {
// 					fy_ctrl.df.options = r.message.financial_years.join('\n');
// 					fy_ctrl.refresh();
// 					if (!fy_ctrl.get_value()) {
// 						fy_ctrl.set_value(r.message.financial_years[0]);
// 					}
// 				}
// 			},
// 		});
// 	}

// 	var CTRL_MAP = {
// 		month:      { ctrl: month_ctrl,    label: 'Month' },
// 		partner_id: { ctrl: partner_ctrl,  label: 'Partner' },
// 		grant_id:   { ctrl: grant_ctrl,    label: 'Grant ID' },
// 		state:      { ctrl: state_ctrl,    label: 'State' },
// 		district:   { ctrl: district_ctrl, label: 'District' },
// 		block:      { ctrl: block_ctrl,    label: 'Block' },
// 	};

// 	function getFilters() {
// 		return {
// 			financial_year: fy_ctrl.get_value()       || '',
// 			month:          month_ctrl.get_value()    || [],
// 			partner_id:     partner_ctrl.get_value()  || [],
// 			grant_id:       grant_ctrl.get_value()    || [],
// 			state:          state_ctrl.get_value()    || [],
// 			district:       district_ctrl.get_value() || [],
// 			block:          block_ctrl.get_value()    || [],
// 		};
// 	}

// 	function hasActiveFilters() {
// 		var f = getFilters();
// 		return ['month','partner_id','grant_id','state','district','block']
// 			.some(function(k) { return (f[k] || []).length > 0; });
// 	}

// 	/* ── PAGE HEADER BUTTONS ───────────────────────────────── */
// 	var $filterBtn = page.add_inner_button(__('Applied filters'), function() {
// 		openFilterDialog();
// 	});
// 	$filterBtn.addClass('btn-default').hide();

// 	var $clearBtn = page.add_inner_button(__('Clear all filters'), function() {
// 		clearAllFilters();
// 	});
// 	$clearBtn.addClass('btn-danger').hide();

// 	function updateFilterBtn() {
// 		if (hasActiveFilters()) {
// 			var total = Object.keys(CTRL_MAP).reduce(function(s, k) {
// 				return s + (getFilters()[k] || []).length;
// 			}, 0);
// 			$filterBtn.text('Applied filters (' + total + ')').show();
// 			$clearBtn.show();
// 		} else {
// 			$filterBtn.hide();
// 			$clearBtn.hide();
// 		}
// 	}

// 	function clearAllFilters() {
// 		Object.keys(CTRL_MAP).forEach(function(k) { CTRL_MAP[k].ctrl.set_value([]); });
// 		updateFilterBtn();
// 		loadData();
// 	}

// 	/* ── FILTER DIALOG ─────────────────────────────────────── */
// 	function openFilterDialog() {
// 		var $wrap = $('<div class="cfd-dlg-pills-wrap"></div>');
// 		renderDialogPills($wrap);
// 		var d = new frappe.ui.Dialog({
// 			title: 'Applied filters',
// 			fields: [{ fieldtype:'HTML', fieldname:'pills_html' }],
// 			primary_action_label: 'Close',
// 			primary_action: function() { d.hide(); },
// 		});
// 		d.show();
// 		d.fields_dict.pills_html.$wrapper.empty().append($wrap);
// 	}

// 	function renderDialogPills($wrap) {
// 		$wrap.empty();
// 		var f = getFilters();
// 		var count = 0;
// 		Object.keys(CTRL_MAP).forEach(function(key) {
// 			(f[key] || []).forEach(function(v) {
// 				count++;
// 				var info = CTRL_MAP[key];
// 				var $pill = $('<span class="cfd-dlg-pill">'
// 					+ '<span class="cfd-dlg-pill-lbl">' + info.label + '</span>'
// 					+ '<span class="cfd-dlg-pill-val">' + v + '</span>'
// 					+ '<button class="cfd-dlg-pill-x" title="Remove">'
// 					+ '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
// 					+ '</button></span>');
// 				$pill.find('.cfd-dlg-pill-x').on('click', function() {
// 					var current = (info.ctrl.get_value() || []).filter(function(x) { return x !== v; });
// 					info.ctrl.set_value(current);
// 					updateFilterBtn();
// 					loadData();
// 					renderDialogPills($wrap);
// 					if (!hasActiveFilters()) { $wrap.closest('.modal').find('[data-dismiss="modal"]').trigger('click'); }
// 				});
// 				$wrap.append($pill);
// 			});
// 		});
// 		if (!count) { $wrap.append('<span class="cfd-dlg-empty">No active filters</span>'); }
// 	}

// 	/* ── APPLY FILTERS TO DB ───────────────────────────────── */
// 	function applyFilters(db) {
// 		var f = getFilters();
// 		var budgets = db.budgets.filter(function(b) {
// 			if (f.partner_id.length && f.partner_id.indexOf(b.partner_id) < 0) return false;
// 			if (f.grant_id.length   && f.grant_id.indexOf(b.grant_id)     < 0) return false;
// 			if (f.state.length      && f.state.indexOf(b.state)           < 0) return false;
// 			if (f.district.length   && f.district.indexOf(b.district)     < 0) return false;
// 			if (f.block.length      && f.block.indexOf(b.block)           < 0) return false;
// 			return true;
// 		});
// 		var budgetNames = budgets.map(function(b) { return b.name; });
// 		var disbursements = db.disbursements.filter(function(d) {
// 			if (budgetNames.indexOf(d.budget) < 0) return false;
// 			if (f.partner_id.length && f.partner_id.indexOf(d.partner_id) < 0) return false;
// 			return true;
// 		});
// 		var utilisations = db.utilisations.filter(function(u) {
// 			if (budgetNames.indexOf(u.budget) < 0) return false;
// 			if (f.partner_id.length && f.partner_id.indexOf(u.partner_id) < 0) return false;
// 			if (f.month.length      && f.month.indexOf(u.month)           < 0) return false;
// 			if (f.state.length      && f.state.indexOf(u.state)           < 0) return false;
// 			if (f.district.length   && f.district.indexOf(u.district)     < 0) return false;
// 			if (f.block.length      && f.block.indexOf(u.block)           < 0) return false;
// 			return true;
// 		});
// 		return { budgets: budgets, disbursements: disbursements, utilisations: utilisations };
// 	}

// 	/* ── COMPUTE SUMMARY ───────────────────────────────────── */
// 	function computeSummary(db) {
// 		var tB  = db.budgets.reduce(function(s, r) { return s + r.total_budget; }, 0);
// 		var tD  = db.disbursements.reduce(function(s, r) { return s + r.amount; }, 0);
// 		var tU  = db.utilisations.reduce(function(s, r) { return s + r.amount; }, 0);
// 		var tBk = db.utilisations.filter(function(u) { return u.bank_bal > 0; })
// 			.reduce(function(s, u) { return s + u.bank_bal + u.interest; }, 0);
// 		return {
// 			summary: {
// 				partners:  unique(db.budgets.map(function(b) { return b.partner_id; })).length,
// 				states:    unique(db.budgets.map(function(b) { return b.state; })).length,
// 				districts: unique(db.budgets.map(function(b) { return b.district; })).length,
// 				blocks:    unique(db.budgets.map(function(b) { return b.block; })).length,
// 				creches:   db.budgets.reduce(function(s, b) { return s + b.no_of_creches; }, 0),
// 			},
// 			cards: {
// 				budget:         { value: tB,       pct: null },
// 				utilisation:    { value: tU,       pct: tB ? parseFloat(((tU / tB) * 100).toFixed(1)) : 0 },
// 				disbursed:      { value: tD,       pct: tB ? parseFloat(((tD / tB) * 100).toFixed(1)) : 0 },
// 				budget_balance: { value: tB - tU,  pct: null },
// 				bank_balance:   { value: tBk,      pct: null },
// 				balance_amount: { value: tB - tD,  pct: null },
// 			},
// 		};
// 	}

// 	/* ── COMPUTE DRILL ─────────────────────────────────────── */
// 	function computeDrill(key, db) {
// 		if (key === 'partners') {
// 			var rows = db.budgets.map(function(b) { return [b.partner_name,b.partner_id,b.grant_id,b.state,b.district,b.block,b.no_of_creches,inr(b.total_budget)]; });
// 			return { heads:['#','Partner name','Partner ID','Grant ID','State','District','Block','Crèches','Total budget'], rows:rows, totals:['Total',null,null,null,null,null, db.budgets.reduce(function(s,b){return s+b.no_of_creches;},0), inr(db.budgets.reduce(function(s,b){return s+b.total_budget;},0))] };
// 		}
// 		if (key === 'states') {
// 			var sm = {};
// 			db.budgets.forEach(function(b) {
// 				if (!sm[b.state]) sm[b.state] = { p:[], c:0, d:[], budget:0 };
// 				if (sm[b.state].p.indexOf(b.partner_id) < 0) sm[b.state].p.push(b.partner_id);
// 				if (sm[b.state].d.indexOf(b.district)   < 0) sm[b.state].d.push(b.district);
// 				sm[b.state].c += b.no_of_creches; sm[b.state].budget += b.total_budget;
// 			});
// 			var rows = Object.keys(sm).map(function(s) { return [s,sm[s].p.length,sm[s].c,sm[s].d.length,inr(sm[s].budget)]; });
// 			return { heads:['#','State','Partners','Crèches','Districts','Total budget'], rows:rows, totals:['Total',null, db.budgets.reduce(function(s,b){return s+b.no_of_creches;},0),null, inr(db.budgets.reduce(function(s,b){return s+b.total_budget;},0))] };
// 		}
// 		if (key === 'districts') {
// 			var rows = db.budgets.map(function(b) { return [b.district,b.state,b.partner_name,b.block,b.no_of_creches]; });
// 			return { heads:['#','District','State','Partner','Block','Crèches'], rows:rows, totals:['Total',null,null,null, db.budgets.reduce(function(s,b){return s+b.no_of_creches;},0)] };
// 		}
// 		if (key === 'blocks') {
// 			var rows = db.budgets.map(function(b) { return [b.block,b.district,b.state,b.partner_name,b.no_of_creches]; });
// 			return { heads:['#','Block','District','State','Partner','Crèches'], rows:rows, totals:['Total',null,null,null, db.budgets.reduce(function(s,b){return s+b.no_of_creches;},0)] };
// 		}
// 		if (key === 'creches') {
// 			var rows = db.budgets.map(function(b) { return [b.partner_name,b.state,b.district,b.block,b.grant_id,b.financial_year,b.no_of_creches]; });
// 			return { heads:['#','Partner','State','District','Block','Grant ID','Financial year','Crèches'], rows:rows, totals:['Total',null,null,null,null,null, db.budgets.reduce(function(s,b){return s+b.no_of_creches;},0)] };
// 		}
// 		if (key === 'budget') {
// 			var rows = db.budgets.map(function(b) { return [b.partner_name,b.grant_id,b.name,b.financial_year,b.no_of_creches,inr(b.total_budget),b.state]; });
// 			return { heads:['#','Partner name','Grant ID','Budget ref.','Financial year','Crèches','Total budget','State'], rows:rows, totals:['Total',null,null,null, db.budgets.reduce(function(s,b){return s+b.no_of_creches;},0), inr(db.budgets.reduce(function(s,b){return s+b.total_budget;},0)),null] };
// 		}
// 		if (key === 'utilisation') {
// 			/* Group by parent doc: partner + month + financial year (parent-level fields) */
// 			var seen = {}, parentRows = [];
// 			db.utilisations.forEach(function(u) {
// 				var key2 = u.partner + '||' + u.month + '||' + u.fy;
// 				if (!seen[key2]) {
// 					seen[key2] = {
// 						partner:    u.partner,
// 						month:      u.month,
// 						fy:         u.fy,
// 						state:      u.state,
// 						district:   u.district,
// 						block:      u.block,
// 						total_util: 0,
// 						bank_bal:   u.bank_bal || 0,
// 						interest:   u.interest || 0,
// 					};
// 					parentRows.push(seen[key2]);
// 				}
// 				seen[key2].total_util += u.amount;
// 			});
// 			var rows = parentRows.map(function(p) {
// 				return [
// 					p.partner,
// 					p.month,
// 					p.fy,
// 					p.state,
// 					p.district,
// 					p.block,
// 					inr(p.total_util),
// 					p.bank_bal > 0 ? inr(p.bank_bal) : '—',
// 				];
// 			});
// 			var tTotalUtil = parentRows.reduce(function(s,p){return s+p.total_util;},0);
// 			return {
// 				heads: ['#','Partner','Month','Financial year','State','District','Block','Total utilisation','Bank balance'],
// 				rows:  rows,
// 				totals: ['Total',null,null,null,null,null, inr(tTotalUtil), null]
// 			};
// 		}
// 		if (key === 'disbursed') {
// 			var cum = {};
// 			var rows = db.disbursements.map(function(d) { cum[d.budget]=(cum[d.budget]||0)+d.amount; return [d.partner,d.grant,d.ref,d.date,inr(d.amount),inr(cum[d.budget])]; });
// 			return { heads:['#','Partner name','Grant ID','Budget ref.','Date','Disbursed amount','Cumulative total'], rows:rows, totals:['Total',null,null,null, inr(db.disbursements.reduce(function(s,d){return s+d.amount;},0)),null] };
// 		}
// 		if (key === 'budget_balance') {
// 			var rows = db.budgets.map(function(b) {
// 				var u = db.utilisations.filter(function(x){return x.budget===b.name;}).reduce(function(s,x){return s+x.amount;},0);
// 				return [b.partner_name,b.grant_id,inr(b.total_budget),inr(u),inr(b.total_budget-u),pctStr(u,b.total_budget)];
// 			});
// 			var tBd = db.budgets.reduce(function(s,b){return s+b.total_budget;},0);
// 			var tU  = db.utilisations.reduce(function(s,u){return s+u.amount;},0);
// 			return { heads:['#','Partner name','Grant ID','Total budget','Total utilised','Balance','% used'], rows:rows, totals:['Total',null,inr(tBd),inr(tU),inr(tBd-tU),pctStr(tU,tBd)] };
// 		}
// 		if (key === 'bank_balance') {
// 			var rows = db.utilisations.filter(function(u){return u.bank_bal>0;}).map(function(u) {
// 				var bg = db.budgets.find(function(x){return x.name===u.budget;});
// 				return [u.partner, bg?bg.grant_id:'—', u.month, u.fy, inr(u.bank_bal), inr(u.interest)];
// 			});
// 			return { heads:['#','Partner name','Grant ID','Month','Financial year','Cash + bank balance','Interest from bank'], rows:rows, totals:['Total',null,null,null, inr(db.utilisations.reduce(function(s,u){return s+u.bank_bal;},0)), inr(db.utilisations.reduce(function(s,u){return s+u.interest;},0))] };
// 		}
// 		if (key === 'balance_amount') {
// 			var rows = db.budgets.map(function(b) {
// 				var d = db.disbursements.filter(function(x){return x.budget===b.name;}).reduce(function(s,x){return s+x.amount;},0);
// 				return [b.partner_name,b.grant_id,b.name,inr(b.total_budget),inr(d),inr(b.total_budget-d)];
// 			});
// 			var tBd = db.budgets.reduce(function(s,b){return s+b.total_budget;},0);
// 			var tD  = db.disbursements.reduce(function(s,d){return s+d.amount;},0);
// 			return { heads:['#','Partner name','Grant ID','Budget ref.','Total budget','Total disbursed','Balance available'], rows:rows, totals:['Total',null,null,inr(tBd),inr(tD),inr(tBd-tD)] };
// 		}
// 		return { heads:[], rows:[], totals:[] };
// 	}

// 	/* ── CARD DEFS ─────────────────────────────────────────── */
// 	var CARD_DEFS = [
// 		{ key:'budget',         label:'Total budget',               sub:'Approved grant budget',    badge:null,                                           accent:'#1a5fa8', iconBg:'#dbeafe', iconClr:'#1e40af', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>', foot:'Σ Creche Budget → total_budget' },
// 		{ key:'utilisation',    label:'Total utilisation',          sub:'Spent against budget',     badge:{ bg:'#fef3c7', clr:'#92400e' },                accent:'#f59e0b', iconBg:'#fef3c7', iconClr:'#92400e', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', foot:'Σ Utilisation Items → total_amount' },
// 		{ key:'disbursed',      label:'Total disbursed',            sub:'Released to partners',     badge:{ bg:'#d1fae5', clr:'#065f46' },                accent:'#10b981', iconBg:'#d1fae5', iconClr:'#065f46', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>', foot:'Σ Disbursement Tracker → disbursed_amount' },
// 		{ key:'budget_balance', label:'Budget utilisation balance', sub:'Budget − utilisation',     badge:{ label:'Remaining', bg:'#ede9fe', clr:'#5b21b6' }, accent:'#7c3aed', iconBg:'#ede9fe', iconClr:'#5b21b6', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', foot:'total_budget − Σ utilisation' },
// 		{ key:'bank_balance',   label:'Bank & cash balance',        sub:'Cash + bank at month end', badge:null,                                           accent:'#ef4444', iconBg:'#fee2e2', iconClr:'#b91c1c', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M19 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>', foot:'balance_amount + interest_from_bank' },
// 		{ key:'balance_amount', label:'Balance amount',             sub:'Budget − disbursed',       badge:{ label:'Undisbursed', bg:'#fce7f3', clr:'#9d174d' }, accent:'#ec4899', iconBg:'#fce7f3', iconClr:'#9d174d', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>', foot:'total_budget − total_disbursement' },
// 	];

// 	var DRILL_META = {
// 		partners:       { title:'Active partners',                       sub:'Creche Budget → partner_id (distinct)' },
// 		states:         { title:'Working states',                        sub:'Creche Budget → state (distinct)' },
// 		districts:      { title:'Working districts',                     sub:'Creche Budget → district (distinct)' },
// 		blocks:         { title:'Working blocks',                        sub:'Creche Budget → block (distinct)' },
// 		creches:        { title:'Crèche count by partner',               sub:'Creche Budget → no_of_creches' },
// 		budget:         { title:'Budget by partner & grant',             sub:'Click ᴇ to view line items for a row' },
// 		utilisation:    { title:'Utilisation by expense head',           sub:'Click ᴇ to view line items for a row' },
// 		disbursed:      { title:'Disbursement history',                  sub:'Creche Disbursement → Disbursement Tracker' },
// 		budget_balance: { title:'Budget utilisation balance by partner', sub:'total_budget − Σ utilisation_items.total_amount' },
// 		bank_balance:   { title:'Bank & cash balance — end of month',    sub:'Creche utilisation → balance_amount + interest_from_bank' },
// 		balance_amount: { title:'Balance amount (budget − disbursed)',   sub:'Creche Disbursement → balence_budget' },
// 	};

// 	/* ── MAIN BODY ─────────────────────────────────────────── */
// 	var $body = $('<div class="cfd-body"></div>').appendTo(page.body);

// 	$body.append('<div class="cfd-test-badge">'
// 		+ '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
// 		+ ' Showing test data — wire loadData() to live API when ready</div>');

// 	var $strip = $('<div class="cfd-strip">'
// 		+ '<div class="cfd-si" data-key="partners" ><div class="cfd-si-lbl">Partners</div> <div class="cfd-si-val" id="sv-partners">—</div><div class="cfd-si-sub">Active</div></div>'
// 		+ '<div class="cfd-si" data-key="states"   ><div class="cfd-si-lbl">States</div>   <div class="cfd-si-val" id="sv-states">—</div>  <div class="cfd-si-sub">Working</div></div>'
// 		+ '<div class="cfd-si" data-key="districts"><div class="cfd-si-lbl">Districts</div><div class="cfd-si-val" id="sv-districts">—</div><div class="cfd-si-sub">Working</div></div>'
// 		+ '<div class="cfd-si" data-key="blocks"   ><div class="cfd-si-lbl">Blocks</div>   <div class="cfd-si-val" id="sv-blocks">—</div>  <div class="cfd-si-sub">Working</div></div>'
// 		+ '<div class="cfd-si" data-key="creches"  ><div class="cfd-si-lbl">Crèches</div>  <div class="cfd-si-val" id="sv-creches">—</div> <div class="cfd-si-sub">Operational</div></div>'
// 		+ '</div>').appendTo($body);
// 	$strip.find('.cfd-si').on('click', function() { openDrill($(this).data('key')); });

// 	$body.append('<div class="cfd-sec">'
// 		+ '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
// 		+ ' Financial overview — click any card to drill down</div>');

// 	var $cards = $('<div class="cfd-cards" id="cfd-cards"></div>').appendTo($body);
// 	var $drill = $('<div id="cfd-drill"></div>').appendTo($body).hide();

// 	/* ── LOAD DATA ─────────────────────────────────────────── */
// 	var _lastDrillKey = null;

// 	function loadData() {
// 		if (!USE_LIVE_API) {
// 			var filtered = applyFilters(TEST_DB);
// 			var data     = computeSummary(filtered);
// 			renderStrip(data.summary);
// 			renderCards(data.cards);
// 			if (_lastDrillKey) { openDrill(_lastDrillKey); } else { closeDrill(); }
// 			return;
// 		}
// 		var filters = JSON.stringify(getFilters());
// 		frappe.call({
// 			method: API.dashboardData,
// 			args: { filters: filters },
// 			callback: function(r) {
// 				console.log('[CFD] get_dashboard_data response:', r.message);
// 				if (!r.message) return;
// 				renderStrip(r.message.summary);
// 				renderCards(r.message.cards);
// 				if (_lastDrillKey) { openDrill(_lastDrillKey); } else { closeDrill(); }
// 			},
// 		});
// 	}

// 	function renderStrip(s) {
// 		$('#sv-partners').text(s.partners);
// 		$('#sv-states').text(s.states);
// 		$('#sv-districts').text(s.districts);
// 		$('#sv-blocks').text(s.blocks);
// 		$('#sv-creches').text(s.creches);
// 	}

// 	function renderCards(data) {
// 		$cards.empty();
// 		CARD_DEFS.forEach(function(c) {
// 			var d = data[c.key] || { value:0, pct:null };
// 			var pctLabel = (d.pct !== null && d.pct !== undefined)
// 				? parseFloat(d.pct).toFixed(1) + '% of budget'
// 				: (c.badge && c.badge.label ? c.badge.label : '');
// 			var badgeHtml = c.badge
// 				? '<span class="cfd-kc-badge" style="background:' + c.badge.bg + ';color:' + c.badge.clr + '">' + pctLabel + '</span>'
// 				: '<span></span>';
// 			var $card = $('<div class="cfd-kc" id="cfd-kc-' + c.key + '">'
// 				+ '<div class="cfd-kc-accent" style="background:' + c.accent + '"></div>'
// 				+ '<div class="cfd-kc-top">'
// 				+ '<div class="cfd-kc-icon" style="background:' + c.iconBg + ';color:' + c.iconClr + '">' + c.icon + '</div>'
// 				+ badgeHtml + '</div>'
// 				+ '<div class="cfd-kc-lbl">' + c.label + '</div>'
// 				+ '<div class="cfd-kc-val">' + inr(d.value) + '</div>'
// 				+ '<div class="cfd-kc-sub">' + c.sub + '</div>'
// 				+ '<div class="cfd-kc-foot">'
// 				+ '<span class="cfd-kc-flbl">' + c.foot + '</span>'
// 				+ '<span class="cfd-kc-flink"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg> Details</span>'
// 				+ '</div></div>');
// 			$card.on('click', function() { openDrill(c.key); });
// 			$cards.append($card);
// 		});
// 	}

// 	/* ── DRILL-DOWN ───────────────────────────────────────
// 	/* ═══════════════════════════════════════════════════════
// 	   DETAIL PAGE — shown when a card/strip/table row is clicked
// 	   Shows budget + utilisation summary for the selected entity,
// 	   then lets the user open the slide panel for line items.
// 	═══════════════════════════════════════════════════════ */

// 	/* ── Detail page CSS (injected once) ── */
// 	(function() {
// 		if (document.getElementById('cfd-detail-css')) return;
// 		var s = document.createElement('style');
// 		s.id = 'cfd-detail-css';
// 		s.textContent = [
// 			/* Detail page container */
// 			'.cfd-detail { animation: cfdDetailIn .22s ease; }',
// 			'@keyframes cfdDetailIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }',
// 			/* Back bar */
// 			'.cfd-detail-back { display:flex; align-items:center; gap:10px; padding:10px 0 14px; border-bottom:1px solid var(--border-color); margin-bottom:16px; }',
// 			'.cfd-detail-back-btn { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:var(--border-radius); background:var(--bg-color); border:1px solid var(--border-color); font-size:12px; font-weight:600; color:var(--text-muted); cursor:pointer; transition:background .12s; }',
// 			'.cfd-detail-back-btn:hover { background:var(--border-color); color:var(--text-color); }',
// 			'.cfd-detail-back-title { font-size:15px; font-weight:700; color:var(--text-color); }',
// 			'.cfd-detail-back-sub { font-size:11px; color:var(--text-muted); margin-left:auto; }',
// 			/* Partner meta strip */
// 			'.cfd-detail-meta { display:flex; flex-wrap:wrap; gap:0; background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); overflow:hidden; margin-bottom:14px; }',
// 			'.cfd-detail-meta-item { flex:1; min-width:120px; padding:10px 16px; border-right:1px solid var(--border-color); }',
// 			'.cfd-detail-meta-item:last-child { border-right:none; }',
// 			'.cfd-detail-meta-lbl { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; margin-bottom:3px; }',
// 			'.cfd-detail-meta-val { font-size:13px; font-weight:700; color:var(--text-color); }',
// 			/* Section heading */
// 			'.cfd-detail-sec { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; margin:14px 0 9px; padding-bottom:6px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:6px; }',
// 			/* Summary cards row */
// 			'.cfd-detail-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }',
// 			'@media(max-width:900px){ .cfd-detail-cards{grid-template-columns:repeat(2,1fr);} }',
// 			/* Summary card */
// 			'.cfd-detail-card { background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:13px 15px; position:relative; overflow:hidden; cursor:pointer; transition:border-color .15s,box-shadow .15s; }',
// 			'.cfd-detail-card:hover { border-color:var(--primary); box-shadow:0 2px 8px rgba(0,0,0,.07); }',
// 			'.cfd-detail-card-accent { position:absolute; top:0; left:0; right:0; height:3px; }',
// 			'.cfd-detail-card-lbl { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; margin-top:6px; }',
// 			'.cfd-detail-card-val { font-size:20px; font-weight:700; color:var(--text-color); line-height:1; margin-bottom:3px; }',
// 			'.cfd-detail-card-sub { font-size:11px; color:var(--text-muted); }',
// 			'.cfd-detail-card-foot { display:flex; align-items:center; justify-content:space-between; margin-top:10px; padding-top:8px; border-top:1px solid var(--border-color); }',
// 			'.cfd-detail-card-hint { font-size:10px; color:var(--primary); font-weight:600; display:flex; align-items:center; gap:3px; }',
// 			/* Progress bar inside card */
// 			'.cfd-detail-bar { height:4px; background:var(--border-color); border-radius:2px; margin-top:8px; overflow:hidden; }',
// 			'.cfd-detail-bar-fill { height:100%; border-radius:2px; transition:width .5s ease; }',
// 			/* Utilisation table */
// 			'.cfd-detail-tbl-wrap { overflow-x:auto; overflow-y:auto; max-height:340px; border:1px solid var(--border-color); border-radius:var(--border-radius-lg); margin-bottom:16px; }',
// 			'.cfd-detail-tbl { width:100%; border-collapse:separate; border-spacing:0; font-size:var(--text-sm); min-width:520px; }',
// 			'.cfd-detail-tbl thead tr { background:#1a4f8a; }',
// 			'.cfd-detail-tbl thead th { padding:8px 12px; text-align:left; font-size:10px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; border-right:1px solid rgba(255,255,255,.15); position:sticky; top:0; z-index:2; background:#1a4f8a; }',
// 			'.cfd-detail-tbl thead th:first-child { text-align:center; width:36px; }',
// 			'.cfd-detail-tbl thead th:last-child { border-right:none; }',
// 			'.cfd-detail-tbl tbody tr { background:var(--card-bg); }',
// 			'.cfd-detail-tbl tbody tr:nth-child(even) { background:var(--bg-color); }',
// 			'.cfd-detail-tbl tbody tr:hover { background:var(--primary-light) !important; }',
// 			'.cfd-detail-tbl tbody td { padding:8px 12px; font-size:var(--text-sm); color:var(--text-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color); white-space:nowrap; }',
// 			'.cfd-detail-tbl tbody tr:last-child td { border-bottom:none; }',
// 			'.cfd-detail-tbl tbody td:last-child { border-right:none; }',
// 			'.cfd-detail-tbl tfoot td { background:#0b2e70 !important; color:#fff !important; font-weight:700; padding:8px 12px; border-right:1px solid rgba(255,255,255,.2); }',
// 			'.cfd-detail-tbl tfoot td:last-child { border-right:none; }',
// 			'.cfd-detail-tdn { text-align:center; font-size:11px; color:var(--text-muted); }',
// 			'.cfd-detail-view-btn { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:4px; border:none; background:transparent; cursor:pointer; color:var(--primary); transition:background .12s; }',
// 			'.cfd-detail-view-btn:hover { background:var(--primary-light); }',
// 		].join('\n');
// 		document.head.appendChild(s);
// 	}());

// 	function openDrill(key) {
// 		_lastDrillKey = key;
// 		$('.cfd-kc,.cfd-si').removeClass('active');
// 		$('#cfd-kc-' + key).addClass('active');
// 		$('.cfd-si[data-key="' + key + '"]').addClass('active');

// 		var meta      = DRILL_META[key] || { title: key, sub: '' };
// 		var isLineKey = (key === 'budget' || key === 'utilisation');

// 		function _renderDrill(d) {
// 			var allRows = d.rows || [];
// 			var total   = allRows.length;
// 			var hasRef  = d.heads && d.heads[d.heads.length - 1] === '_ref';

// 			/* Strip _ref from display heads */
// 			var displayHeads = hasRef ? d.heads.slice(0, d.heads.length - 1) : (d.heads || []);

// 			/* ────────────────────────────────────────────────────────────
// 			   BUDGET grouping
// 			   row idx: [0]partner_name [1]grant_id [2]budget_ref
// 			            [3]fy [4]creches [5]total_budget [6]state [7]_ref

// 			   Group header shows: Partner | Grant ID | Crèches | Budget | State
// 			   Expanded child shows: Budget ref | FY | Crèches | Budget | State | 👁
// 			─────────────────────────────────────────────────────────── */
// 			var thead = '', tbody = '';

// 			if (key === 'budget') {
// 				thead = '<th style="width:36px;">#</th>'
// 					+ '<th style="min-width:180px;">Partner name</th>'
// 					+ '<th style="min-width:120px;">Grant ID</th>'
// 					+ '<th style="min-width:160px;">Budget ref.</th>'
// 					+ '<th style="min-width:100px;">Financial year</th>'
// 					+ '<th style="text-align:right;min-width:80px;">Crèches</th>'
// 					+ '<th style="text-align:right;min-width:120px;">Total budget</th>'
// 					+ '<th style="min-width:100px;">State</th>'
// 					+ '<th style="width:42px;text-align:center;"></th>';

// 				/* Group by Grant ID */
// 				var gMap = {}, gOrder = [];
// 				allRows.forEach(function(row, i) {
// 					var gid = row[1] || '—';
// 					if (!gMap[gid]) { gMap[gid] = []; gOrder.push(gid); }
// 					gMap[gid].push({ row: row, origIdx: i });
// 				});

// 				var rowNum = 0;
// 				gOrder.forEach(function(gid) {
// 					var members = gMap[gid];
// 					/* Aggregate for header */
// 					var partners = [], states = [], totalCreches = 0, totalBudgetSum = 0;
// 					members.forEach(function(m) {
// 						var r = m.row;
// 						if (r[0] && partners.indexOf(r[0]) < 0) partners.push(r[0]);
// 						if (r[6] && states.indexOf(r[6]) < 0) states.push(r[6]);
// 						totalCreches += parseInt(r[4]) || 0;
// 						totalBudgetSum += parseFloat(String(r[5] || '0').replace(/[^\d.]/g, '')) || 0;
// 					});
// 					var budgetFmt = '\u20b9' + Math.round(totalBudgetSum).toLocaleString('en-IN');
// 					var count = members.length;

// 					/* ── Collect budget refs & FY range ── */
// 					var budgetRefs = members.map(function(m) { return m.row[2] || ''; }).filter(Boolean);
// 					var fyList = members.map(function(m) { return m.row[3] || ''; }).filter(Boolean);
// 					/* FY range: sort fy strings like "2024-25", pick min and max */
// 					var fySorted = fyList.slice().sort();
// 					/* FY "2023-24,2024-25,2025-26" → "2023-26"
// 					   startYr = first 4 chars of earliest FY
// 					   endYr   = start of latest FY + 1 */
// 					var fyRange = '';
// 					if (fySorted.length === 1) {
// 						fyRange = fySorted[0];
// 					} else if (fySorted.length > 1) {
// 						var _startYr   = fySorted[0].split('-')[0];
// 						var _lastStart = parseInt((fySorted[fySorted.length-1]).split('-')[0]);
// 						var _endYr     = String(_lastStart + 1);
// 						fyRange = _startYr + '–' + _endYr;
// 					}

// 					/* ── Group header row (collapsed) ── */
// 					tbody += '<tr class="cfd-grant-hdr collapsed" data-grant="' + gid + '">'
// 						/* # + Partner */
// 						+ '<td></td>'
// 						+ '<td style="display:flex;align-items:center;gap:0;border-right:none !important;">'
// 						+ '<span class="cfd-grant-toggle">&#9654;</span>'
// 						+ partners.join(', ')
// 						+ '<span class="cfd-grant-badge">'
// 						+ count + (count > 1 ? ' budgets' : ' budget')
// 						+ '</span>'
// 						+ '</td>'
// 						/* Grant ID */
// 						+ '<td>' + gid + '</td>'
// 						/* Budget refs — comma separated */
// 						+ '<td style="font-size:11px;opacity:.9;">' + budgetRefs.join(', ') + '</td>'
// 						/* FY range */
// 						+ '<td style="font-size:11px;opacity:.9;">' + fyRange + '</td>'
// 						/* Crèches */
// 						+ '<td class="num">' + totalCreches + '</td>'
// 						/* Total budget */
// 						+ '<td class="num">' + budgetFmt + '</td>'
// 						/* State */
// 						+ '<td>' + states.join(', ') + '</td>'
// 						/* Consolidated view button for all budgets in this grant */
// 						+ '<td style="text-align:center;padding:0 4px;">'
// 						+ '<button class="cfd-view-btn cfd-grant-view-btn" '
// 						+ 'data-grant-ids="' + members.map(function(m){return m.origIdx;}).join(',') + '" '
// 						+ 'title="View all line items for this grant">'
// 						+ '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
// 						+ '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
// 						+ '<circle cx="12" cy="12" r="3"/></svg>'
// 						+ '</button>'
// 						+ '</td>'
// 						+ '</tr>';

// 					/* ── Child rows (hidden initially) ── */
// 					members.forEach(function(m) {
// 						rowNum++;
// 						var r = m.row;
// 						var viewBtn = '<td style="text-align:center;padding:0 4px;">'
// 							+ '<button class="cfd-view-btn" data-row-idx="' + m.origIdx + '" title="View line items">'
// 							+ '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
// 							+ '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
// 							+ '<circle cx="12" cy="12" r="3"/></svg></button></td>';
// 						tbody += '<tr class="cfd-grant-child row-hidden" data-grant-child="' + gid + '" data-row-idx="' + m.origIdx + '">'
// 							+ '<td class="cfd-tdn">' + rowNum + '</td>'
// 							+ '<td>' + (r[0] || '') + '</td>'             /* Partner name */
// 							+ '<td>' + (r[1] || '') + '</td>'             /* Grant ID */
// 							+ '<td style="font-weight:700;">' + (r[2] || '') + '</td>'  /* Budget ref */
// 							+ '<td>' + (r[3] || '') + '</td>'             /* FY */
// 							+ '<td class="num">' + (r[4] || '') + '</td>' /* Crèches */
// 							+ '<td class="num">' + (r[5] || '') + '</td>' /* Budget */
// 							+ '<td>' + (r[6] || '') + '</td>'             /* State */
// 							+ viewBtn + '</tr>';
// 					});
// 				});

// 			/* ────────────────────────────────────────────────────────────
// 			   UTILISATION grouping
// 			   row idx: [0]partner [1]month [2]fy [3]state
// 			            [4]district [5]block [6]total_util [7]bank_bal [8]_ref
// 			─────────────────────────────────────────────────────────── */
// 			} else if (key === 'utilisation') {
// 				thead = '<th style="width:36px;">#</th>'
// 					+ '<th style="min-width:180px;">Partner</th>'
// 					+ '<th style="min-width:100px;">Month</th>'
// 					+ '<th style="min-width:100px;">Financial year</th>'
// 					+ '<th style="min-width:100px;">State</th>'
// 					+ '<th style="min-width:100px;">District</th>'
// 					+ '<th style="min-width:80px;">Block</th>'
// 					+ '<th style="text-align:right;min-width:130px;">Total utilisation</th>'
// 					+ '<th style="text-align:right;min-width:110px;">Bank balance</th>'
// 					+ '<th style="width:42px;text-align:center;"></th>';

// 				/* Group by Month */
// 				var gMap = {}, gOrder = [];
// 				allRows.forEach(function(row, i) {
// 					var gid = row[1] || '—';
// 					if (!gMap[gid]) { gMap[gid] = []; gOrder.push(gid); }
// 					gMap[gid].push({ row: row, origIdx: i });
// 				});

// 				var rowNum = 0;
// 				gOrder.forEach(function(gid) {
// 					var members = gMap[gid];
// 					var partners = [], states = [], totalUtil = 0;
// 					members.forEach(function(m) {
// 						var r = m.row;
// 						if (r[0] && partners.indexOf(r[0]) < 0) partners.push(r[0]);
// 						if (r[3] && states.indexOf(r[3]) < 0) states.push(r[3]);
// 						totalUtil += parseFloat(String(r[6] || '0').replace(/[^\d.]/g, '')) || 0;
// 					});
// 					var utilFmt = '\u20b9' + Math.round(totalUtil).toLocaleString('en-IN');
// 					var count = members.length;
// 					var fy = members[0].row[2] || '';

// 					/* Group header */
// 					tbody += '<tr class="cfd-grant-hdr collapsed" data-grant="' + gid + '">'
// 						+ '<td></td>'
// 						+ '<td style="display:flex;align-items:center;gap:0;border-right:none !important;">'
// 						+ '<span class="cfd-grant-toggle">&#9654;</span>'
// 						+ partners.join(', ')
// 						+ '<span class="cfd-grant-badge">'
// 						+ count + (count > 1 ? ' records' : ' record')
// 						+ '</span>'
// 						+ '</td>'
// 						+ '<td>' + gid + '</td>'      /* Month */
// 						+ '<td>' + fy + '</td>'        /* FY */
// 						+ '<td>' + states.join(', ') + '</td>'
// 						+ '<td></td><td></td>'
// 						+ '<td class="num">' + utilFmt + '</td>'
// 						+ '<td class="num"></td>'
// 						+ '<td></td>'
// 						+ '</tr>';

// 					/* Child rows */
// 					members.forEach(function(m) {
// 						rowNum++;
// 						var r = m.row;
// 						var viewBtn = '<td style="text-align:center;padding:0 4px;">'
// 							+ '<button class="cfd-view-btn" data-row-idx="' + m.origIdx + '" title="View line items">'
// 							+ '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
// 							+ '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
// 							+ '<circle cx="12" cy="12" r="3"/></svg></button></td>';
// 						tbody += '<tr class="cfd-grant-child row-hidden" data-grant-child="' + gid + '" data-row-idx="' + m.origIdx + '">'
// 							+ '<td class="cfd-tdn">' + rowNum + '</td>'
// 							+ '<td>' + (r[0] || '') + '</td>'
// 							+ '<td>' + (r[1] || '') + '</td>'
// 							+ '<td>' + (r[2] || '') + '</td>'
// 							+ '<td>' + (r[3] || '') + '</td>'
// 							+ '<td>' + (r[4] || '') + '</td>'
// 							+ '<td>' + (r[5] || '') + '</td>'
// 							+ '<td class="num">' + (r[6] || '') + '</td>'
// 							+ '<td class="num">' + (r[7] || '\u2014') + '</td>'
// 							+ viewBtn + '</tr>';
// 					});
// 				});

// 			/* ── All other drill keys — flat table ── */
// 			} else {
// 				thead = displayHeads.map(function(h) { return '<th>' + h + '</th>'; }).join('')
// 					+ (isLineKey ? '<th style="width:42px;text-align:center;"></th>' : '');
// 				allRows.forEach(function(row, i) {
// 					var displayRow = hasRef ? row.slice(0, row.length - 1) : row;
// 					var cells = displayRow.map(function(cell, ci) {
// 						return '<td' + (ci === 0 ? ' class="cfd-tbold"' : '') + '>' + (cell != null ? cell : '') + '</td>';
// 					}).join('');
// 					var viewBtn = isLineKey
// 						? '<td style="text-align:center;padding:0 4px;">'
// 						  + '<button class="cfd-view-btn" data-row-idx="' + i + '" title="View line items">'
// 						  + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
// 						  + '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
// 						  + '<circle cx="12" cy="12" r="3"/></svg></button></td>'
// 						: '';
// 					tbody += '<tr data-row-idx="' + i + '"><td class="cfd-tdn">' + (i + 1) + '</td>' + cells + viewBtn + '</tr>';
// 				});
// 			}

// 			/* ── Total footer ── */
// 			var tfoot = '';
// 			if (d.totals && d.totals.length && key !== 'budget' && key !== 'utilisation') {
// 				var displayTotals = hasRef ? d.totals.slice(0, d.totals.length - 1) : d.totals;
// 				var tcells = displayTotals.map(function(t, ti) {
// 					return '<td style="text-align:' + (ti > 0 ? 'right' : 'left') + '">' + (t != null ? t : '') + '</td>';
// 				}).join('');
// 				tfoot = '<tfoot><tr><td></td>' + tcells + (isLineKey ? '<td></td>' : '') + '</tr></tfoot>';
// 			} else if ((key === 'budget' || key === 'utilisation') && d.totals && d.totals.length) {
// 				/* Custom total for grouped tables */
// 				var grandCreches = '', grandBudget = '';
// 				if (key === 'budget') {
// 					grandCreches = d.totals[4] != null ? d.totals[4] : '';
// 					grandBudget  = d.totals[5] != null ? d.totals[5] : '';
// 					tfoot = '<tfoot><tr>'
// 						+ '<td colspan="5" style="text-align:left;"><strong>Total</strong></td>'
// 						+ '<td style="text-align:right;">' + grandCreches + '</td>'
// 						+ '<td style="text-align:right;">' + grandBudget + '</td>'
// 						+ '<td></td><td></td>'
// 						+ '</tr></tfoot>';
// 				} else {
// 					var totalUtil = d.totals[6] != null ? d.totals[6] : '';
// 					tfoot = '<tfoot><tr>'
// 						+ '<td colspan="7" style="text-align:left;"><strong>Total</strong></td>'
// 						+ '<td style="text-align:right;">' + totalUtil + '</td>'
// 						+ '<td></td><td></td>'
// 						+ '</tr></tfoot>';
// 				}
// 			}

// 			/* ── Panel HTML ── */
// 			$drill.html('<div class="cfd-drill">'
// 				+ '<div class="cfd-dh">'
// 				+ '<div class="cfd-dhl">'
// 				+ '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
// 				+ '<div><div class="cfd-dht">' + meta.title + '</div><div class="cfd-dhs">' + meta.sub + '</div></div>'
// 				+ '</div>'
// 				+ '<div style="display:flex;align-items:center;gap:10px;">'
// 				+ '<span style="font-size:11px;font-weight:600;background:rgba(255,255,255,0.15);color:#fff;padding:2px 8px;border-radius:4px;">' + total + ' records</span>'
// 				+ '<button class="cfd-dcb" id="cfd-drill-close">&#215;</button>'
// 				+ '</div></div>'
// 				+ '<div class="cfd-tscroll">'
// 				+ '<table class="cfd-tbl"><thead><tr>' + thead + '</tr></thead>'
// 				+ '<tbody>' + tbody + '</tbody>' + tfoot + '</table>'
// 				+ '</div></div>').show();

// 			/* ── Bindings ── */
// 			$('#cfd-drill-close').on('click', closeDrill);

// 			$drill.find('.cfd-grant-hdr').on('click', function() {
// 				var gid  = $(this).data('grant');
// 				var isCollapsed = $(this).hasClass('collapsed');
// 				$(this).toggleClass('collapsed', !isCollapsed);
// 				/* Toggle arrow */
// 				$(this).find('.cfd-grant-toggle').html(isCollapsed ? '&#9660;' : '&#9654;');
// 				$drill.find('.cfd-grant-child[data-grant-child="' + gid + '"]').toggleClass('row-hidden', !isCollapsed);
// 			});

// 			if (isLineKey) {
// 				/* Individual row view */
// 				$drill.find('.cfd-view-btn:not(.cfd-grant-view-btn)').on('click', function(e) {
// 					e.stopPropagation();
// 					var rowIdx = parseInt($(this).data('row-idx'));
// 					var row    = allRows[rowIdx];
// 					if (!row) return;
// 					if (USE_LIVE_API) {
// 						openLinePanelLive(key, row[row.length - 1], row);
// 					} else {
// 						openLineItemPopup(key, row, applyFilters(TEST_DB));
// 					}
// 				});
// 				/* Consolidated grant view */
// 				$drill.find('.cfd-grant-view-btn').on('click', function(e) {
// 					e.stopPropagation();
// 					var idxList  = $(this).data('grant-ids').toString().split(',').map(Number);
// 					var rows     = idxList.map(function(i) { return allRows[i]; }).filter(Boolean);
// 					if (!rows.length) return;
// 					var grantId  = rows[0][1];
// 					var partners = [];
// 					rows.forEach(function(r) { if (r[0] && partners.indexOf(r[0]) < 0) partners.push(r[0]); });
// 					var title = partners.join(', ') + ' — Grant ' + grantId + ' (Consolidated)';
// 					if (USE_LIVE_API) {
// 						openConsolidatedPanel(key, title, rows);
// 					} else {
// 						openConsolidatedPopupTestDB(key, title, rows, applyFilters(TEST_DB));
// 					}
// 				});
// 			}

// 			$drill[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
// 		} /* end _renderDrill */

// 		if (!USE_LIVE_API) {
// 			var filtered = applyFilters(TEST_DB);
// 			_renderDrill(computeDrill(key, filtered));
// 			return;
// 		}
// 		/* Live API */
// 		frappe.call({
// 			method: API.drillData,
// 			args: { drill_key: key, filters: JSON.stringify(getFilters()) },
// 			callback: function(r) {
// 				console.log('[CFD] get_drill_data (' + key + ') response:', r.message);
// 				_renderDrill(r.message || { heads:[], rows:[], totals:[] });
// 			},
// 		});
// 	}

// 	/* ── Build parent doctype detail strip above the drill table ── */
// 	function buildParentDetailStrip(key, allRows, db) {
// 		if (!allRows || !allRows.length) return '';

// 		/* Collect unique budget records referenced in these rows */
// 		var budgetRefs = [];
// 		if (key === 'budget') {
// 			/* row = [partner_name, grant_id, budget_ref, fy, creches, total_budget, state] */
// 			allRows.forEach(function(r) { if (r[2] && budgetRefs.indexOf(r[2]) < 0) budgetRefs.push(r[2]); });
// 		} else {
// 			/* utilisation row = [partner, month, main, sub, type, amount]
// 			   find budget recs by partner name */
// 			allRows.forEach(function(r) {
// 				var b = db.budgets.filter(function(b) { return b.partner_name === r[0]; })[0];
// 				if (b && budgetRefs.indexOf(b.name) < 0) budgetRefs.push(b.name);
// 			});
// 		}

// 		var budgets = db.budgets.filter(function(b) { return budgetRefs.indexOf(b.name) >= 0; });
// 		if (!budgets.length) return '';

// 		/* One detail card per partner budget record */
// 		var cards = budgets.map(function(b) {
// 			var utilRows = db.utilisations.filter(function(u) { return u.budget === b.name; });
// 			var disbRows = db.disbursements.filter(function(d) { return d.budget === b.name; });
// 			var totalUtil = utilRows.reduce(function(s, u) { return s + u.amount; }, 0);
// 			var totalDisb = disbRows.reduce(function(s, d) { return s + d.amount; }, 0);
// 			var utilPct   = b.total_budget ? Math.round((totalUtil / b.total_budget) * 100) : 0;
// 			var disbPct   = b.total_budget ? Math.round((totalDisb / b.total_budget) * 100) : 0;
// 			var uc = utilPct > 80 ? '#ef4444' : utilPct > 50 ? '#f59e0b' : '#10b981';

// 			return '<div class="cfd-parent-card">'
// 				/* Header row */
// 				+ '<div class="cfd-parent-card-head">'
// 				+ '<div class="cfd-parent-card-name">' + (b.partner_name || b.partner_id) + '</div>'
// 				+ '<span class="cfd-parent-card-ref">' + b.name + '</span>'
// 				+ '</div>'
// 				/* Field grid */
// 				+ '<div class="cfd-parent-card-grid">'
// 				+ pField('Grant ID',       b.grant_id)
// 				+ pField('Financial year', b.financial_year)
// 				+ pField('State',          b.state)
// 				+ pField('District',       b.district)
// 				+ pField('Block',          b.block)
// 				+ pField('Crèches',        b.no_of_creches)
// 				+ pField('Total budget',   inr(b.total_budget))
// 				+ pField('Utilised',       inr(totalUtil) + ' <span style="color:' + uc + ';font-size:10px;font-weight:700;">(' + utilPct + '%)</span>')
// 				+ pField('Disbursed',      inr(totalDisb) + ' <span style="color:#185fa5;font-size:10px;font-weight:700;">(' + disbPct + '%)</span>')
// 				+ pField('Balance',        inr(b.total_budget - totalUtil))
// 				+ '</div>'
// 				/* Utilisation progress bar */
// 				+ '<div class="cfd-parent-card-bar-wrap">'
// 				+ '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:3px;">'
// 				+ '<span>Utilisation</span><span style="color:' + uc + ';font-weight:700;">' + utilPct + '%</span>'
// 				+ '</div>'
// 				+ '<div style="height:5px;background:var(--border-color);border-radius:3px;overflow:hidden;">'
// 				+ '<div style="height:100%;border-radius:3px;background:' + uc + ';width:' + Math.min(utilPct, 100) + '%;transition:width .5s;"></div>'
// 				+ '</div>'
// 				+ '</div>'
// 				+ '</div>';
// 		});

// 		return '<div class="cfd-parent-strip"><div class="cfd-parent-strip-label">'
// 			+ '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
// 			+ ' Partner details from Creche Budget</div>'
// 			+ '<div class="cfd-parent-cards-row">' + cards.join('') + '</div>'
// 			+ '</div>';
// 	}

// 	function pField(label, value) {
// 		return '<div class="cfd-parent-field">'
// 			+ '<div class="cfd-parent-field-lbl">' + label + '</div>'
// 			+ '<div class="cfd-parent-field-val">' + (value != null ? value : '—') + '</div>'
// 			+ '</div>';
// 	}

// 	/* ── Line item popup → builds groups then opens slide panel ── */
// 	/* ── Live API: fetch child line items then open slide panel ── */
// 	/* ── Consolidated panel: merges line items from multiple budget docs ── */
// 	function openConsolidatedPanel(key, title, rows) {
// 		/* rows = array of allRows entries, each has _ref at last index */
// 		var docNames = rows.map(function(r) { return r[r.length - 1]; }).filter(Boolean);
// 		if (!docNames.length) {
// 			frappe.msgprint({ title:'No records', message:'No document refs found.', indicator:'orange' });
// 			return;
// 		}
// 		var dtKey = (key === 'budget') ? 'budget' : 'utilisation';

// 		/* Fetch line items for each doc in parallel, then merge */
// 		var promises = docNames.map(function(docName) {
// 			return new Promise(function(resolve) {
// 				frappe.call({
// 					method: API.lineItems,
// 					args:   { doctype_key: dtKey, parent_name: docName },
// 					callback: function(r) { resolve(r.message || []); },
// 				});
// 			});
// 		});

// 		Promise.all(promises).then(function(allGroups) {
// 			/* Merge groups: same label → merge subs → same sub label → merge items */
// 			var mergedMap = {};
// 			var mergedOrder = [];
// 			allGroups.forEach(function(groups) {
// 				(groups || []).forEach(function(g) {
// 					if (!mergedMap[g.label]) {
// 						mergedMap[g.label] = { label:g.label, color:g.color, total:0, subMap:{}, subOrder:[] };
// 						mergedOrder.push(g.label);
// 					}
// 					var mg = mergedMap[g.label];
// 					mg.total += g.total || 0;
// 					(g.subs || []).forEach(function(sh) {
// 						if (!mg.subMap[sh.label]) {
// 							mg.subMap[sh.label] = [];
// 							mg.subOrder.push(sh.label);
// 						}
// 						(sh.items || []).forEach(function(item) { mg.subMap[sh.label].push(item); });
// 					});
// 				});
// 			});

// 			var merged = mergedOrder.map(function(label) {
// 				var mg = mergedMap[label];
// 				return {
// 					label: label, color: mg.color, total: mg.total,
// 					subs: mg.subOrder.map(function(sl) {
// 						return { label: sl, items: mg.subMap[sl] };
// 					}),
// 				};
// 			});

// 			if (!merged.length) {
// 				frappe.msgprint({ title:'No line items', message:'No child records found for this grant.', indicator:'orange' });
// 				return;
// 			}
// 			var total = merged.reduce(function(s,g){return s+g.total;},0);
// 			openSlidePanel(title, total, merged);
// 		});
// 	}

// 	/* TEST_DB consolidated fallback */
// 	function openConsolidatedPopupTestDB(key, title, rows, db) {
// 		var PALETTE = ['#1a4f8a','#f59e0b','#10b981','#7c3aed','#ef4444','#ec4899'];
// 		var mainMap = {}, mainOrder = [];

// 		rows.forEach(function(row) {
// 			var budgetRef = row[2];
// 			var items = db.utilisations.filter(function(u) { return u.budget === budgetRef; });
// 			items.forEach(function(u) {
// 				if (!mainMap[u.main]) { mainMap[u.main] = {}; mainOrder.push(u.main); }
// 				if (!mainMap[u.main][u.sub]) mainMap[u.main][u.sub] = [];
// 				mainMap[u.main][u.sub].push({ name: u.type, amount: u.amount });
// 			});
// 		});

// 		var ci = 0;
// 		var groups = mainOrder.map(function(main) {
// 			var color = PALETTE[ci++ % PALETTE.length];
// 			var subs  = Object.keys(mainMap[main]).map(function(sub) {
// 				return { label: sub, items: mainMap[main][sub] };
// 			});
// 			var total = subs.reduce(function(s,sh){return s+sh.items.reduce(function(s2,i){return s2+i.amount;},0);},0);
// 			return { label:main, color:color, total:total, subs:subs };
// 		});

// 		if (!groups.length) {
// 			frappe.msgprint({ title:'No line items', message:'No records found.', indicator:'orange' });
// 			return;
// 		}
// 		var total = groups.reduce(function(s,g){return s+g.total;},0);
// 		openSlidePanel(title, total, groups);
// 	}

// 	function openLinePanelLive(key, docName, row) {
// 		var dtKey = (key === 'budget') ? 'budget' : 'utilisation';
// 		/* Title from row: budget=[partner,grant,ref,...], util=[partner,month,...] */
// 		/* budget row  = [partner_name, grant_id, budget_ref_name, fy, creches, total_budget, state, _ref]
// 		   util row   = [partner_name, month, financial_year, state, district, block, total_util, bank_bal, _ref] */
// 		var title = key === 'budget'
// 			? (row[0] + ' — ' + (row[2] || docName))
// 			: (row[0] + ' — ' + row[1] + ' (' + (row[2] || '') + ')');
// 		frappe.call({
// 			method: API.lineItems,
// 			args:   { doctype_key: dtKey, parent_name: docName },
// 			callback: function(r) {
// 				console.log('[CFD] get_line_items (' + dtKey + ', ' + docName + ') response:', r.message);
// 				if (!r.message || !r.message.length) {
// 					frappe.msgprint({ title:'No line items', message:'No child records found for: ' + docName, indicator:'orange' });
// 					return;
// 				}
// 				var groups = r.message;
// 				console.log('[CFD] groups:', JSON.stringify(groups, null, 2));
// 				var total  = groups.reduce(function(s,g){return s+g.total;},0);
// 				openSlidePanel(title, total, groups);
// 			},
// 		});
// 	}

// 	function openLineItemPopup(key, row, db) {
// 		var title, totalAmount, groups;

// 		if (key === 'budget') {
// 			/* row = [partner_name, grant_id, budget_ref, fy, creches, total_budget, state] */
// 			var budgetRef   = row[2];
// 			var partnerName = row[0];
// 			var budgetRec   = db.budgets.filter(function(b) { return b.name === budgetRef; })[0];
// 			totalAmount = budgetRec ? budgetRec.total_budget : 0;
// 			var items   = db.utilisations.filter(function(u) { return u.budget === budgetRef; });
// 			title = partnerName + ' — ' + budgetRef;
// 			var mainMap = {};
// 			items.forEach(function(u) {
// 				if (!mainMap[u.main]) mainMap[u.main] = {};
// 				if (!mainMap[u.main][u.sub]) mainMap[u.main][u.sub] = [];
// 				mainMap[u.main][u.sub].push({ name: u.type, amount: u.amount });
// 			});
// 			var palette = ['#1a4f8a','#f59e0b','#10b981','#7c3aed','#ef4444','#ec4899'];
// 			var ci = 0;
// 			groups = Object.keys(mainMap).map(function(main) {
// 				var color = palette[ci++ % palette.length];
// 				var subs  = Object.keys(mainMap[main]).map(function(sub) {
// 					return { label: sub, items: mainMap[main][sub] };
// 				});
// 				var total = subs.reduce(function(s, sh) {
// 					return s + sh.items.reduce(function(s2, i) { return s2 + i.amount; }, 0);
// 				}, 0);
// 				return { label: main, color: color, total: total, subs: subs };
// 			});
// 		}

// 		if (key === 'utilisation') {
// 			/* row = [partner, month, fy, state, district, block, total_util, bank_bal]
// 			   Fetch ALL utilisation child items for this partner + month, group by main head */
// 			var partnerName = row[0], month = row[1];
// 			var items = db.utilisations.filter(function(u) {
// 				return u.partner === partnerName && u.month === month;
// 			});
// 			totalAmount = items.reduce(function(s, u) { return s + u.amount; }, 0);
// 			title = partnerName + ' — ' + month;
// 			/* Group by main head → sub head → type of expenses */
// 			var mainMap = {};
// 			items.forEach(function(u) {
// 				if (!mainMap[u.main]) mainMap[u.main] = {};
// 				if (!mainMap[u.main][u.sub]) mainMap[u.main][u.sub] = [];
// 				mainMap[u.main][u.sub].push({ name: u.type, amount: u.amount });
// 			});
// 			var palette = ['#1a4f8a','#f59e0b','#10b981','#7c3aed','#ef4444','#ec4899'];
// 			var ci = 0;
// 			groups = Object.keys(mainMap).map(function(main) {
// 				var color = palette[ci++ % palette.length];
// 				var subs  = Object.keys(mainMap[main]).map(function(sub) {
// 					return { label: sub, items: mainMap[main][sub] };
// 				});
// 				var total = subs.reduce(function(s, sh) {
// 					return s + sh.items.reduce(function(s2, i) { return s2 + i.amount; }, 0);
// 				}, 0);
// 				return { label: main, color: color, total: total, subs: subs };
// 			});
// 		}

// 		if (!groups || !groups.length) {
// 			frappe.msgprint({ title: 'No line items', message: 'No records found for this row.', indicator: 'orange' });
// 			return;
// 		}

// 		openSlidePanel(title, totalAmount, groups);
// 	}

// 	/* ── Slide panel: renders groups into the right-side panel ── */
// 	function openSlidePanel(title, totalAmount, groups) {
// 		var esc    = function(s) { return frappe.utils.escape_html(String(s || '')); };
// 		var inrFmt = function(v) { return '₹' + Math.round(v || 0).toLocaleString('en-IN'); };
// 		var COLS   = '1fr 130px';

// 		$('#cfd-panel-title').text(title);
// 		$('#cfd-panel-col-hdr')
// 			.css('grid-template-columns', COLS)
// 			.html('<div>Expense item</div><div style="text-align:right;">Amount</div>');

// 		var grandTotal = groups.reduce(function(s, g) { return s + g.total; }, 0);
// 		var totalItems = groups.reduce(function(s, g) {
// 			return s + g.subs.reduce(function(s2, sh) { return s2 + sh.items.length; }, 0);
// 		}, 0);

// 		/* Summary strip */
// 		$('#cfd-panel-strip').html(
// 			'<div style="display:flex;align-items:center;gap:20px;padding:6px 14px 8px;">'
// 			+ '<div><div class="cfd-panel-sum-lbl">Total amount</div><div class="cfd-panel-sum-val">' + inrFmt(grandTotal) + '</div></div>'
// 			+ '<div><div class="cfd-panel-sum-lbl">Expense heads</div><div class="cfd-panel-sum-val">' + groups.length + '</div></div>'
// 			+ '<div><div class="cfd-panel-sum-lbl">Line items</div><div class="cfd-panel-sum-val">' + totalItems + '</div></div>'
// 			+ '</div>'
// 		);

// 		/* Tab defs: All + one per main head */
// 		var tabDefs = [{ id: '__all__', label: 'All Items', color: '#1a4f8a', groups: groups }]
// 			.concat(groups.map(function(g) {
// 				return { id: g.label, label: g.label, color: g.color, groups: [g] };
// 			}));

// 		/* Tab bar */
// 		var $tabBar = $('#cfd-panel-tab-bar').empty();
// 		tabDefs.forEach(function(tab) {
// 			var amtHtml = tab.id !== '__all__'
// 				? '<span style="font-size:10px;color:#aaa;margin-left:3px;">' + inrFmt(tab.groups[0].total) + '</span>'
// 				: '';
// 			var $t = $('<div class="cfd-panel-tab' + (tab.id === '__all__' ? ' active' : '') + '" data-tab="' + tab.id + '">'
// 				+ '<span class="cfd-panel-tab-dot" style="background:' + tab.color + ';"></span>'
// 				+ esc(tab.label) + amtHtml + '</div>');
// 			$t.on('click', function() { activateTab($(this).data('tab')); });
// 			$tabBar.append($t);
// 		});

// 		/* Render rows for a tab */
// 		function renderRows(tabGroups) {
// 			var $rows  = $('#cfd-panel-rows').empty();
// 			var gTotal = tabGroups.reduce(function(s, g) { return s + g.total; }, 0);

// 			tabGroups.forEach(function(g, gi) {
// 				/* Section header */
// 				var $sec = $('<div class="cfd-panel-sec" style="grid-template-columns:' + COLS + ';">'
// 					+ '<div style="display:flex;align-items:center;">'
// 					+ '<span class="cfd-panel-sec-dot" style="background:' + g.color + ';"></span>'
// 					+ '<strong>' + esc(g.label) + '</strong>'
// 					+ '<span class="cfd-panel-sec-toggle" style="margin-left:8px;">&#9660;</span>'
// 					+ '</div>'
// 					+ '<div style="text-align:right;padding:9px 12px;">' + inrFmt(g.total) + '</div>'
// 					+ '</div>').css('animation-delay', (gi * 30) + 'ms');
// 				$rows.append($sec);

// 				g.subs.forEach(function(sh, si) {
// 					var shTotal = sh.items.reduce(function(s, i) { return s + i.amount; }, 0);
// 					var subItems = [];

// 					/* Sub-head row */
// 					var $sub = $('<div class="cfd-panel-sub" style="grid-template-columns:' + COLS + ';">'
// 						+ '<div><span style="font-size:9px;margin-right:5px;color:#888;" class="sub-tog">&#9660;</span>' + esc(sh.label) + '</div>'
// 						+ '<div>' + inrFmt(shTotal) + '</div>'
// 						+ '</div>').css('animation-delay', (gi * 30 + si * 18 + 15) + 'ms');

// 					/* Line item rows */
// 					sh.items.forEach(function(item, ii) {
// 						var $item = $('<div class="cfd-panel-item" style="grid-template-columns:' + COLS + ';">'
// 							+ '<div>' + esc(item.name) + '</div>'
// 							+ '<div>' + inrFmt(item.amount) + '</div>'
// 							+ '</div>').css('animation-delay', (gi * 30 + si * 18 + ii * 10 + 25) + 'ms');
// 						subItems.push($item);
// 					});

// 					/* Sub-head toggle */
// 					$sub.on('click', function() {
// 						var open = $(this).data('open') !== false;
// 						$(this).data('open', !open);
// 						$(this).find('.sub-tog').html(open ? '&#9654;' : '&#9660;');
// 						subItems.forEach(function($i) { $i.toggleClass('row-hidden', open); });
// 					});

// 					$rows.append($sub);
// 					subItems.forEach(function($i) { $rows.append($i); });
// 				});

// 				/* Section toggle */
// 				$sec.on('click', function() {
// 					var open = !$(this).hasClass('collapsed');
// 					$(this).toggleClass('collapsed', open);
// 					$(this).nextUntil('.cfd-panel-sec, .cfd-panel-total').toggle(!open);
// 				});
// 			});

// 			/* Total row */
// 			$rows.append($('<div class="cfd-panel-total" style="grid-template-columns:' + COLS + ';">'
// 				+ '<div>TOTAL</div>'
// 				+ '<div>' + inrFmt(gTotal) + '</div>'
// 				+ '</div>'));
// 		}

// 		function activateTab(tabId) {
// 			$('#cfd-panel-tab-bar .cfd-panel-tab').removeClass('active');
// 			$('#cfd-panel-tab-bar .cfd-panel-tab[data-tab="' + tabId + '"]').addClass('active');
// 			var tab = tabDefs.filter(function(t) { return t.id === tabId; })[0];
// 			$('#cfd-panel-rows').css('opacity', 0);
// 			setTimeout(function() {
// 				renderRows(tab.groups);
// 				$('#cfd-panel-rows').css({ opacity: 1, transition: 'opacity .12s' });
// 			}, 60);
// 		}

// 		renderRows(groups);
// 		$('#cfd-panel-overlay').addClass('open');
// 	}

// 	function closeDrill() {
// 		_lastDrillKey = null;
// 		$drill.empty().hide();
// 		$('.cfd-kc,.cfd-si').removeClass('active');
// 	}


// 	/* ── INIT ──────────────────────────────────────────────── */
// 	if (USE_LIVE_API) {
// 		loadFilterOptions();
// 		/* loadData() is called after FY is set in loadFilterOptions callback */
// 		setTimeout(loadData, 400); /* fallback if no FY returned */
// 	} else {
// 		fy_ctrl.set_value('2024-25');
// 		loadData();
// 	}
// };
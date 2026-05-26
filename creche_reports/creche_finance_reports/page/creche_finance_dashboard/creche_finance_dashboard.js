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
		// Inject slide panel into body (outside page content so it overlays correctly)
		if (!$('#fd-panel-overlay').length) {
			$('body').append(`
				<div id="fd-panel-overlay">
					<div id="fd-panel">
						<div id="fd-panel-header">
							<button id="fd-panel-close">×</button>
							<div id="fd-panel-title">Breakdown</div>
							<div id="fd-panel-header-right">
								<label id="fd-expand-wrap">
									<input type="checkbox" id="fd-expand-cb"> Expand All
								</label>
							</div>
						</div>
						<!-- Breadcrumb roadmap -->
						<div id="fd-panel-breadcrumb"></div>
						<!-- Tab bar + summary strip -->
						<div id="fd-panel-sidebar"></div>
						<!-- Column header + scrollable rows -->
						<div id="fd-panel-content">
							<div id="fd-panel-col-hdr"></div>
							<div id="fd-panel-rows"></div>
						</div>
					</div>
				</div>
			`);
			$(document).on('click', '#fd-panel-close', () => this._close_panel());
			$(document).on('click', '#fd-panel-overlay', (e) => { if (e.target.id === 'fd-panel-overlay') this._close_panel(); });
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

	// ── Filter options ────────────────────────────────────────────────────────
	async _load_filter_options(cascade = false) {
		const args = cascade ? this._filters_for_cascade() : {};
		const r = await frappe.call({ method: 'creche_reports.api.dashboard.get_dashboard_filters', args });
		this.filter_options = r.message || {};
		this.partner_name_to_id = {};
		(this.filter_options.partners || []).forEach(p => { this.partner_name_to_id[p.name] = p.id; });
	}

	// ── Filter bar ────────────────────────────────────────────────────────────
	_render_filter_bar() {
		const fo = this.filter_options;
		this.$bar.empty();
		const defs = [
			{ key: 'year',     label: 'Year',     opts: fo.financial_years || [] },
			{ key: 'partner',  label: 'Partner',  opts: (fo.partners || []).map(p => p.name) },
			{ key: 'grant',    label: 'Grant',    opts: fo.grants || [] },
			{ key: 'state',    label: 'State',    opts: fo.states || [] },
			{ key: 'district', label: 'District', opts: fo.districts || [] },
			{ key: 'block',    label: 'Block',    opts: fo.blocks || [] },
			{ key: 'month',    label: 'Month',    opts: fo.months || [] },
			{ key: 'quarter',  label: 'Quarter',  opts: fo.quarters || [] },
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
			this._init_ms($f, fd.key, fd.opts, this.filter_values[fd.key] || []);
		});
		const $btns = $(`<div class="fd-bar-btns">
			<button class="btn btn-primary btn-sm">&#10003; Apply Filters</button>
			<button class="btn btn-default btn-sm fd-clear-btn">Clear All</button>
		</div>`);
		this.$bar.append($btns);
		$btns.find('.btn-primary').on('click', () => this.refresh());
		$btns.find('.fd-clear-btn').on('click', async () => {
			this.filter_values = {};
			await this._load_filter_options(false);
			this._render_filter_bar();
			this.refresh();
		});
		$(document).off('click.fd-ms').on('click.fd-ms', (e) => {
			if (!$(e.target).closest('.fd-ms-wrap').length) {
				this.$bar.find('.fd-ms-dropdown').hide();
				this.$bar.find('.fd-ms-box').removeClass('fd-ms-open');
			}
		});
	}

	_init_ms($field, key, opts, selected) {
		const $wrap = $field.find(`.fd-ms-wrap[data-key="${key}"]`);
		const $box  = $wrap.find('.fd-ms-box');
		const $tags = $wrap.find(`.fd-ms-tags[data-key="${key}"]`);
		const $inp  = $wrap.find(`.fd-ms-input[data-key="${key}"]`);
		const $dd   = $wrap.find(`.fd-ms-dropdown[data-key="${key}"]`);
		let sel = new Set(selected);
		const render_tags = () => {
			$tags.empty();
			sel.forEach(val => {
				const $t = $(`<span class="fd-ms-tag">${this._esc(val)}<span class="fd-ms-tag-x">×</span></span>`);
				$t.find('.fd-ms-tag-x').on('click', (e) => {
					e.stopPropagation(); sel.delete(val);
					this.filter_values[key] = [...sel]; render_tags(); render_dd(); this._schedule_cascade();
				});
				$tags.append($t);
			});
		};
		const render_dd = (q = '') => {
			$dd.empty();
			const items = opts.filter(o => o.toLowerCase().includes(q.toLowerCase()) && !sel.has(o));
			if (!items.length) { $dd.html('<div class="fd-ms-empty">No options</div>'); return; }
			items.forEach(opt => {
				const $i = $(`<div class="fd-ms-item">${this._esc(opt)}</div>`);
				$i.on('mousedown', (e) => {
					e.preventDefault(); sel.add(opt); this.filter_values[key] = [...sel];
					$inp.val(''); render_tags(); render_dd(''); this._schedule_cascade();
				});
				$dd.append($i);
			});
		};
		$box.on('click', (e) => {
			if ($(e.target).hasClass('fd-ms-tag-x')) return;
			this.$bar.find('.fd-ms-dropdown').not($dd).hide();
			this.$bar.find('.fd-ms-box').not($box).removeClass('fd-ms-open');
			$box.addClass('fd-ms-open'); render_dd($inp.val()); $dd.show(); $inp.focus();
		});
		$inp.on('input', () => render_dd($inp.val()));
		$inp.on('keydown', (e) => {
			if (e.key === 'Backspace' && !$inp.val() && sel.size) {
				const last = [...sel].pop(); sel.delete(last);
				this.filter_values[key] = [...sel]; render_tags(); render_dd(); this._schedule_cascade();
			}
			if (e.key === 'Escape') { $dd.hide(); $box.removeClass('fd-ms-open'); }
		});
		render_tags();
	}

	_schedule_cascade() {
		clearTimeout(this._cascade_timer);
		this._cascade_timer = setTimeout(async () => {
			const saved = { ...this.filter_values };
			await this._load_filter_options(true);
			const fo = this.filter_options;
			const new_opts = {
				year: fo.financial_years||[], partner: (fo.partners||[]).map(p=>p.name),
				grant: fo.grants||[], state: fo.states||[], district: fo.districts||[],
				block: fo.blocks||[], month: fo.months||[], quarter: fo.quarters||[],
			};
			Object.keys(new_opts).forEach(k => {
				const v = new Set(new_opts[k]);
				this.filter_values[k] = (saved[k]||[]).filter(x => v.has(x));
			});
			this._render_filter_bar();
		}, 500);
	}

	_filters_for_cascade() {
		const g = k => this.filter_values[k] || [];
		return {
			financial_year: g('year').join(','),
			partner_id: g('partner').map(n => this.partner_name_to_id[n]).filter(Boolean).join(','),
			grant_id: g('grant').join(','), state: g('state').join(','),
			district: g('district').join(','), block: g('block').join(','),
		};
	}

	_active_filters() {
		const g = k => this.filter_values[k] || [];
		return {
			financial_year: g('year').join(','),
			partner_id: g('partner').map(n => this.partner_name_to_id[n]).filter(Boolean).join(','),
			grant_id: g('grant').join(','), state: g('state').join(','),
			district: g('district').join(','), block: g('block').join(','),
			month: g('month').join(','), quarter: g('quarter').join(','),
		};
	}

	// ── Refresh ───────────────────────────────────────────────────────────────
	async refresh() {
		this._set_loading(true);
		try {
			const r = await frappe.call({ method: 'creche_reports.api.dashboard.get_dashboard_summary', args: this._active_filters() });
			this.summary_data = r.message || {};
			this._render_cards(this.summary_data);
			this._render_summary_bar(this.summary_data);
		} finally { this._set_loading(false); }
	}

	// ── Summary bar ───────────────────────────────────────────────────────────
	_render_summary_bar(s) {
		if (!s || !Object.keys(s).length) { this.$summary.empty(); return; }
		this.$summary.html(`
			<div class="fd-sum-bar">
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
				<div class="fd-sum-div"></div>
				<div class="fd-sum-item"><span class="fd-sum-label">Delinquent</span><span class="fd-sum-val" style="color:#E74C3C">${s.delinquent_partners||0}</span></div>
			</div>
		`);
	}

	// ── Cards ─────────────────────────────────────────────────────────────────
	_render_cards(s) {
		const primary = [
			{ key:'budget',      hex:'#2490EF', label:'Total Budget',    value:s.total_budget,      sub:`${s.total_partners||0} partner${s.total_partners===1?'':'s'}`, compact:true, pl:'Budget Breakdown',       icon:this._icon_budget() },
			{ key:'utilisation', hex:'#28A745', label:'Utilisation',     value:s.total_utilisation, sub:this._pct(s.total_utilisation,s.total_budget)+' of budget',     compact:true, pl:'Utilisation Breakdown',  icon:this._icon_utilisation() },
			{ key:'disbursed',   hex:'#E67E22', label:'Disbursed',       value:s.total_disbursed,   sub:this._pct(s.total_disbursed,s.total_budget)+' of budget',       compact:true, pl:'Disbursement Breakdown', icon:this._icon_disbursed() },
		];
		const info = [
			{ key:'balance',    hex:'#8E44AD', label:'Balance Available',   value:s.balance_available,   sub:'Budget − Utilised',                     compact:true,  icon:this._icon_balance() },
			{ key:'delinquent', hex:'#E74C3C', label:'Delinquent Partners', value:s.delinquent_partners, sub:'Missing 100% utilisation declaration',  is_count:true, icon:this._icon_warning() },
			{ key:'bank',       hex:'#1ABC9C', label:'Balance as per Bank', value:s.total_balance_bank,  sub:'Bank + Cash at end of reported month',  compact:true,  icon:this._icon_bank() },
		];
		this.$cards.empty();
		const $p = $('<div class="fd-cards-row fd-cards-primary"></div>');
		primary.forEach(c => {
			const $card = $(`
				<div class="fd-card fd-card-popup" style="--card-color:${c.hex}">
					<div class="fd-card-inner">
						<div class="fd-card-top">
							<div class="fd-card-icon-wrap" style="background:${c.hex}18;color:${c.hex}">${c.icon}</div>
							<div class="fd-card-open-btn" style="color:${c.hex};border-color:${c.hex}30;background:${c.hex}0d">View Details ↗</div>
						</div>
						<div class="fd-card-value" style="color:${c.hex}">${this._fmt_inr(c.value,c.compact)}</div>
						<div class="fd-card-label">${c.label}</div>
						<div class="fd-card-sub">${c.sub}</div>
					</div>
					<div class="fd-card-bar" style="background:${c.hex}"></div>
				</div>`);
			$card.on('click', () => this._open_panel(c.key, c.pl, c.hex));
			$p.append($card);
		});
		const $i = $('<div class="fd-cards-row fd-cards-info"></div>');
		info.forEach(c => {
			const display = c.is_count ? (c.value||0) : this._fmt_inr(c.value,c.compact);
			$i.append(`
				<div class="fd-card fd-card-info" style="--card-color:${c.hex}">
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

	// ── Slide Panel ───────────────────────────────────────────────────────────
	async _open_panel(card_key, title, hex) {
		// Immediately open with loading state
		$('#fd-panel-title').text(title).css('color','#fff');
		$('#fd-panel-breadcrumb').empty();
		$('#fd-panel-sidebar').empty();
		$('#fd-panel-col-hdr').empty();
		$('#fd-panel-rows').html(`<div class="fd-panel-loading"><div class="fd-spinner"></div><div style="margin-top:12px;color:#aaa;font-size:13px">Loading breakdown…</div></div>`);
		$('#fd-expand-wrap').removeClass('visible');
		$('#fd-panel-overlay').addClass('open');

		// Set panel header accent colour
		$('#fd-panel-header').css('background', hex);

		try {
			const pR = await frappe.call({ method:'creche_reports.api.dashboard.get_partner_breakdown', args:this._active_filters() });
			const partners = pR.message || [];
			const bResults = await Promise.all(partners.map(p =>
				frappe.call({ method:'creche_reports.api.dashboard.get_budget_breakdown', args:{...this._active_filters(), partner_id:p.partner_id} })
			));
			const allBudgets = [];
			bResults.forEach((br, pi) => (br.message||[]).forEach(b => allBudgets.push({...b, _pi:pi})));
			const af = this._active_filters();
			const eResults = await Promise.all(allBudgets.map(b =>
				frappe.call({ method:'creche_reports.api.dashboard.get_budget_expense_breakdown',
					args:{budget_reference_id:b.budget_reference_id, month:af.month||'', quarter:af.quarter||''} })
			));
			this._render_panel(card_key, title, hex, partners, allBudgets, eResults);
		} catch(err) {
			$('#fd-panel-rows').html(`<div style="padding:40px;text-align:center;color:#aaa">⚠️ Failed to load. Please try again.</div>`);
			console.error(err);
		}
	}

	_close_panel() {
		$('#fd-panel-overlay').removeClass('open');
		$('#fd-expand-wrap').removeClass('visible');
	}

	// ── Render panel content ──────────────────────────────────────────────────
	_render_panel(card_key, title, hex, partners, allBudgets, eResults) {
		const cfg = {
			budget:      { pk:'total_budget',      ek:'total_budget',   el:'Budget' },
			utilisation: { pk:'total_utilisation',  ek:'total_utilised', el:'Utilised' },
			disbursed:   { pk:'total_disbursed',    ek:'total_disbursed',el:'Disbursed' },
		}[card_key] || { pk:'total_budget', ek:'total_budget', el:'Budget' };

		const COLORS = ['#2490EF','#28A745','#E67E22','#8E44AD','#1ABC9C','#E74C3C','#3498DB','#F39C12','#16A085','#D35400'];
		const vw       = window.innerWidth;
		const isMobile = vw <= 768;

		// Grand totals
		const grandVal = partners.reduce((s,p) => s+(p[cfg.pk]||0), 0);
		const grandBud = partners.reduce((s,p) => s+(p.total_budget||0), 0);
		const grandPct = grandBud ? Math.round((grandVal/grandBud)*100) : 0;
		const grandUc  = grandPct>100?'#E74C3C':grandPct>=60?'#E67E22':'#27ae60';

		// ── Breadcrumb roadmap ──
		this._render_breadcrumb(title, hex, null, null);

		// ── Build tab sections: All + one per partner ──
		const sections = [];
		sections.push({ id:'all', label:'All Partners', color:'#003B63', partners:partners });
		partners.forEach((p, pi) => {
			sections.push({ id:`p${pi}`, label:p.partner_name, color:COLORS[pi%COLORS.length], partners:[p], pi });
		});

		// ── Tab bar ──
		const $sidebar = $('#fd-panel-sidebar').empty();
		const $tabBar  = $('<div id="fd-panel-tab-bar"></div>');
		sections.forEach((sec, si) => {
			const short = sec.label.length > 20 ? sec.label.slice(0,19)+'…' : sec.label;
			$tabBar.append(`<div class="fd-tab-item${si===0?' active':''}" data-sec="${sec.id}">
				<span class="fd-tab-dot" style="background:${sec.color}"></span>
				${this._esc(short)}
			</div>`);
		});
		$sidebar.append($tabBar);

		// ── Summary strip ──
		const $strip = $(`<div id="fd-panel-sum-strip">
			<div class="fd-psum-item"><div class="fd-psum-label">${cfg.el}</div><div class="fd-psum-val" style="color:${hex}">${this._fmt_inr(grandVal,true)}</div></div>
			<div class="fd-psum-item"><div class="fd-psum-label">Total Budget</div><div class="fd-psum-val">${this._fmt_inr(grandBud,true)}</div></div>
			<div class="fd-psum-item"><div class="fd-psum-label">Util %</div><div class="fd-psum-val" style="color:${grandUc}">${grandPct}%</div></div>
			<div class="fd-psum-item"><div class="fd-psum-label">Partners</div><div class="fd-psum-val">${partners.length}</div></div>
			<div class="fd-psum-item"><div class="fd-psum-label">Budgets</div><div class="fd-psum-val">${allBudgets.length}</div></div>
		</div>`);
		$sidebar.append($strip);

		// ── Column definitions ──
		const cols    = isMobile ? '1fr 110px 110px' : '1fr 130px 130px 75px 120px';
		const colhdrs = isMobile
			? ['Expense Type / Budget', cfg.el, 'Total Budget']
			: ['Expense Type / Budget', cfg.el, 'Total Budget', '% Util', 'Balance'];

		// ── Col header ──
		const $colHdr = $('#fd-panel-col-hdr').css('grid-template-columns', cols).empty();
		colhdrs.forEach(h => $colHdr.append(`<div>${h}</div>`));

		// ── Row renderer ──
		const renderSection = (secId) => {
			const sec = sections.find(s => s.id === secId) || sections[0];
			const $rows = $('#fd-panel-rows').empty();

			const partnersToRender = sec.id === 'all' ? partners : [partners[sec.pi]];
			const subState = {};

			// Update breadcrumb
			if (sec.id === 'all') {
				this._render_breadcrumb(title, hex, null, null);
			} else {
				this._render_breadcrumb(title, hex, sec.label, COLORS[sec.pi % COLORS.length]);
			}

			// Update summary strip values for this section
			const sVal = sec.id === 'all' ? grandVal : (partnersToRender[0]?.[cfg.pk]||0);
			const sBud = sec.id === 'all' ? grandBud : (partnersToRender[0]?.total_budget||0);
			const sPct = sBud ? Math.round((sVal/sBud)*100) : 0;
			const sUc  = sPct>100?'#E74C3C':sPct>=60?'#E67E22':'#27ae60';
			$strip.find('.fd-psum-item').first().find('.fd-psum-val').css('color',hex).text(this._fmt_inr(sVal,true));
			$strip.find('.fd-psum-item').eq(1).find('.fd-psum-val').text(this._fmt_inr(sBud,true));
			$strip.find('.fd-psum-item').eq(2).find('.fd-psum-val').css('color',sUc).text(sPct+'%');

			partnersToRender.forEach((p, pRenderIdx) => {
				const pi      = partners.indexOf(p);
				const color   = COLORS[pi % COLORS.length];
				const pVal    = p[cfg.pk] || 0;
				const pBud    = p.total_budget || 0;
				const pPct    = pBud ? Math.round((pVal/pBud)*100) : 0;
				const pUc     = pPct>100?'#E74C3C':pPct>=60?'#E67E22':'#27ae60';
				const pUcBg   = pPct>100?'#fde8e8':pPct>=60?'#fef3e2':'#e8f8f0';
				const pDiff   = pBud - pVal;
				const pKey    = `partner_${pi}`;
				const pIsOpen = subState[pKey] !== false;

				// Partner section header (only in "All" view)
				if (sec.id === 'all') {
					const $phdr = $(`<div class="fd-drill-sec-hdr${pIsOpen?'':' collapsed'}" data-key="${pKey}" style="grid-template-columns:${cols}">
						<div style="display:flex;align-items:center;gap:8px;padding:10px 12px">
							<span class="fd-tab-dot" style="background:${color};flex-shrink:0"></span>
							<span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._esc(p.partner_name)}</span>
							<span class="fd-sec-toggle" style="margin-left:auto;flex-shrink:0">▼</span>
						</div>
						<div style="padding:10px 12px;text-align:right;font-weight:700;color:${color}">${this._fmt_inr(pVal)}</div>
						<div style="padding:10px 12px;text-align:right;font-weight:700">${this._fmt_inr(pBud)}</div>
						${!isMobile?`<div style="padding:10px 12px;text-align:right"><span class="fd-util-pill" style="background:${pUcBg};color:${pUc}">${pPct}%</span></div>
						<div style="padding:10px 12px;text-align:right;font-weight:700;color:${pDiff<0?'#E74C3C':'#1a6b3a'}">${this._fmt_inr(pDiff)}</div>`:''}
					</div>`);
					$phdr.on('click', function() {
						const key    = $(this).data('key');
						const isOpen = !$(this).hasClass('collapsed');
						subState[key] = !isOpen;
						$(this).toggleClass('collapsed', isOpen);
						$(this).nextUntil('.fd-drill-sec-hdr, .fd-drill-total').toggle(!isOpen);
					});
					$rows.append($phdr);
				}

				// Budgets under this partner
				const pBudgets = allBudgets.filter(b => b._pi === pi);
				pBudgets.forEach((b, bi) => {
					const globalIdx = allBudgets.indexOf(b);
					const exp_data  = eResults[globalIdx]?.message || {};
					const expenses  = exp_data.expense_breakdown || [];
					const months    = exp_data.monthly_summary   || [];
					const bVal      = b[cfg.pk] || 0;
					const bBud      = b.total_budget || 0;
					const bPct      = bBud ? Math.round(((b.total_utilisation||0)/bBud)*100) : 0;
					const bUc       = bPct>100?'#E74C3C':bPct>=60?'#E67E22':'#27ae60';
					const bUcBg     = bPct>100?'#fde8e8':bPct>=60?'#fef3e2':'#e8f8f0';
					const bDiff     = bBud - bVal;
					const bKey      = `budget_${pi}_${bi}`;
					const bIsOpen   = subState[bKey] === true; // budgets collapsed by default

					// Budget row (sub-header)
					const $bhdr = $(`<div class="fd-drill-bud-hdr${bIsOpen?'':' collapsed'}" data-key="${bKey}" style="grid-template-columns:${cols}">
						<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;padding-left:${sec.id==='all'?'28px':'12px'}">
							<span class="fd-bud-toggle" style="font-size:9px;color:#888">▶</span>
							<span style="font-size:12px;font-weight:700;color:${color}">${this._esc(b.grant_id||'—')}</span>
							<span style="font-size:10px;color:#aaa">${this._esc(b.financial_year||'')}${b.state?' · '+this._esc(b.state):''}</span>
						</div>
						<div style="padding:8px 12px;text-align:right;font-weight:700;font-size:12px">${this._fmt_inr(bVal)}</div>
						<div style="padding:8px 12px;text-align:right;font-size:12px">${this._fmt_inr(bBud)}</div>
						${!isMobile?`<div style="padding:8px 12px;text-align:right"><span class="fd-util-pill" style="background:${bUcBg};color:${bUc};font-size:9px">${bPct}%</span></div>
						<div style="padding:8px 12px;text-align:right;font-size:12px;color:${bDiff<0?'#E74C3C':'#555'}">${this._fmt_inr(bDiff)}</div>`:''}
					</div>`);

					$bhdr.on('click', function() {
						const key    = $(this).data('key');
						const isOpen = !$(this).hasClass('collapsed');
						subState[key] = !isOpen;
						$(this).toggleClass('collapsed', isOpen);
						$(this).find('.fd-bud-toggle').text(isOpen ? '▶' : '▼');
						$(this).nextUntil('.fd-drill-bud-hdr, .fd-drill-sec-hdr, .fd-drill-total').toggle(!isOpen);
					});
					$rows.append($bhdr);

					// Expense rows under this budget
					expenses.forEach((e, ei) => {
						const ev   = e[cfg.ek] || 0;
						const eb   = e.total_budget || 0;
						const ebal = e.balance || 0;
						const ePct = e.pct_utilised || 0;
						const eUc  = ePct>100?'#E74C3C':ePct>=60?'#E67E22':'#27ae60';
						const eUcBg= ePct>100?'#fde8e8':ePct>=60?'#fef3e2':'#e8f8f0';
						const $erow = $(`<div class="fd-drill-row fd-exp-row${bIsOpen?'':' fd-drill-hidden'}" data-budkey="${bKey}" style="grid-template-columns:${cols};animation-delay:${Math.min(ei*8,160)}ms">
							<div style="padding:7px 12px;padding-left:${sec.id==='all'?'44px':'28px'};display:flex;align-items:center;gap:6px">
								<span style="font-size:10px;font-weight:600;color:${ebal<0?'#E74C3C':'var(--text-color)'};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
									title="${this._esc(e.type_of_expenses||'')}">${this._esc(e.type_of_expenses||'—')}</span>
								${e.budget_main_head?`<span class="fd-exp-chip">${this._esc(e.budget_main_head)}</span>`:''}
							</div>
							<div style="padding:7px 12px;text-align:right;font-size:12px;font-weight:700;color:${hex}">${this._fmt_inr(ev)}</div>
							<div style="padding:7px 12px;text-align:right;font-size:12px">${this._fmt_inr(eb)}</div>
							${!isMobile?`<div style="padding:7px 12px;text-align:right"><span class="fd-util-pill" style="background:${eUcBg};color:${eUc}">${ePct}%</span></div>
							<div style="padding:7px 12px;text-align:right;font-size:12px;color:${ebal<0?'#E74C3C':'#555'}">${this._fmt_inr(ebal)}</div>`:''}
						</div>`);
						$rows.append($erow);
					});

					// Monthly sub-rows (hidden by default, toggled via month expand)
					months.forEach((m, mi) => {
						const mPct  = m.pct_utilised || 0;
						const mUc   = mPct>100?'#E74C3C':mPct>=60?'#E67E22':'#27ae60';
						const mUcBg = mPct>100?'#fde8e8':mPct>=60?'#fef3e2':'#e8f8f0';
						const mKey  = `mo_${pi}_${bi}_${mi}`;
						const decl  = m.declaration
							? `<span class="fd-pill fd-pill-yes" style="font-size:9px">✓ Decl.</span>`
							: `<span class="fd-pill fd-pill-no" style="font-size:9px">Pending</span>`;

						const $mrow = $(`<div class="fd-drill-row fd-mo-row${bIsOpen?'':' fd-drill-hidden'}" data-budkey="${bKey}" data-mokey="${mKey}" style="grid-template-columns:${cols}">
							<div style="padding:6px 12px;padding-left:${sec.id==='all'?'44px':'28px'};display:flex;align-items:center;gap:6px">
								<span style="font-size:10px;color:#0076B6;cursor:pointer;flex-shrink:0" class="fd-mo-btn" data-key="${mKey}">📅</span>
								<span style="font-size:11px;font-weight:600;color:#555">${this._esc(m.month||'—')}</span>
								<span style="font-size:10px;color:#aaa">${this._esc(m.financial_year||'')}</span>
								${decl}
							</div>
							<div style="padding:6px 12px;text-align:right;font-size:11px;font-weight:700;color:${mUc}">${this._fmt_inr(m.total_utilised)}</div>
							<div style="padding:6px 12px;text-align:right;font-size:11px">${this._fmt_inr(m.monthly_budget)}</div>
							${!isMobile?`<div style="padding:6px 12px;text-align:right"><span class="fd-util-pill" style="background:${mUcBg};color:${mUc};font-size:9px">${mPct}%</span></div>
							<div style="padding:6px 12px;text-align:right;font-size:11px;color:${(m.balance||0)<0?'#E74C3C':'#555'}">${this._fmt_inr(m.balance)}</div>`:''}
						</div>`);
						$rows.append($mrow);

						// Month item sub-rows
						(m.items||[]).forEach(it => {
							const itv   = it[cfg.ek] || it.utilised || 0;
							const $itrow = $(`<div class="fd-drill-row fd-mo-item fd-drill-hidden" data-mokey="${mKey}" style="grid-template-columns:${cols};background:#f8fafd">
								<div style="padding:5px 12px;padding-left:${sec.id==='all'?'58px':'42px'};font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
									title="${this._esc(it.type_of_expenses||'')}">${this._esc(it.type_of_expenses||'—')}</div>
								<div style="padding:5px 12px;text-align:right;font-size:11px">${this._fmt_inr(itv)}</div>
								<div style="padding:5px 12px;text-align:right;font-size:11px">${this._fmt_inr(it.monthly_budget)}</div>
								${!isMobile?`<div></div><div style="padding:5px 12px;text-align:right;font-size:11px;color:${(it.balance||0)<0?'#E74C3C':'#555'}">${this._fmt_inr(it.balance)}</div>`:''}
							</div>`);
							$rows.append($itrow);
						});
					});
				});
			});

			// Total row
			const totVal = sec.id==='all' ? grandVal : (partnersToRender[0]?.[cfg.pk]||0);
			const totBud = sec.id==='all' ? grandBud : (partnersToRender[0]?.total_budget||0);
			const totDif = totBud - totVal;
			const $total = $(`<div class="fd-drill-total fd-drill-row" style="grid-template-columns:${cols}">
				<div style="padding:10px 12px;font-weight:700">TOTAL</div>
				<div style="padding:10px 12px;text-align:right;font-weight:700">${this._fmt_inr(totVal)}</div>
				<div style="padding:10px 12px;text-align:right;font-weight:700">${this._fmt_inr(totBud)}</div>
				${!isMobile?`<div style="padding:10px 12px;text-align:right;font-weight:700">${grandPct}%</div>
				<div style="padding:10px 12px;text-align:right;font-weight:700;color:${totDif<0?'#fda5a5':'#a5f3c6'}">${this._fmt_inr(totDif)}</div>`:''}
			</div>`);
			$rows.append($total);

			// Row animations
			$rows.find('.fd-drill-row:not(.fd-drill-hidden)').each(function(i) {
				$(this).addClass('anim-in').css('animation-delay', Math.min(i*8, 200)+'ms');
			});

			// Month toggle
			$rows.off('click.mo').on('click.mo', '.fd-mo-btn', function(e) {
				e.stopPropagation();
				const key   = $(this).data('key');
				const $subs = $rows.find(`.fd-mo-item[data-mokey="${key}"]`);
				const open  = $subs.first().is(':visible');
				$subs.toggle(!open);
				$(this).text(open ? '📅' : '📅▼');
			});
		};

		// Tab clicks
		$tabBar.on('click', '.fd-tab-item', function() {
			$tabBar.find('.fd-tab-item').removeClass('active');
			$(this).addClass('active');
			$('#fd-panel-rows').css({opacity:0, transform:'translateX(8px)', transition:'opacity .1s, transform .1s'});
			const secId = $(this).data('sec');
			setTimeout(() => {
				renderSection(secId);
				$('#fd-panel-rows').css({opacity:1, transform:'translateX(0)', transition:'opacity .1s, transform .1s'});
			}, 60);
		});

		// Expand All checkbox
		$('#fd-expand-wrap').addClass('visible');
		$('#fd-expand-cb').prop('checked', false).off('change.exp').on('change.exp', function() {
			const expand = $(this).is(':checked');
			$('#fd-panel-rows .fd-drill-sec-hdr').each(function() {
				const isOpen = !$(this).hasClass('collapsed');
				if (expand && !isOpen) { $(this).removeClass('collapsed'); $(this).nextUntil('.fd-drill-sec-hdr, .fd-drill-total').show(); }
				else if (!expand && isOpen) { $(this).addClass('collapsed'); $(this).nextUntil('.fd-drill-sec-hdr, .fd-drill-total').hide(); }
			});
		});

		renderSection('all');
	}

	// ── Breadcrumb roadmap inside panel ──────────────────────────────────────
	_render_breadcrumb(title, hex, partnerName, partnerColor) {
		const crumbs = [
			{ label: 'Dashboard', color: '#555' },
			{ label: title,       color: hex },
		];
		if (partnerName) crumbs.push({ label: partnerName, color: partnerColor });

		$('#fd-panel-breadcrumb').html(`
			<div class="fd-pnl-crumb">
				${crumbs.map((c, i) => {
					const isLast = i === crumbs.length - 1;
					return `
						${i > 0 ? '<span class="fd-pnl-crumb-sep">›</span>' : ''}
						<span class="fd-pnl-crumb-item${isLast ? ' active' : ''}" style="color:${isLast ? c.color : '#999'}">
							${isLast ? `<span class="fd-pnl-crumb-dot" style="background:${c.color}"></span>` : ''}
							${this._esc(c.label)}
						</span>
					`;
				}).join('')}
			</div>
		`);
	}

	// ── Icon SVGs ─────────────────────────────────────────────────────────────
	_icon_budget()      { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`; }
	_icon_utilisation() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`; }
	_icon_disbursed()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>`; }
	_icon_balance()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>`; }
	_icon_warning()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`; }
	_icon_bank()        { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`; }

	// ── Utilities ─────────────────────────────────────────────────────────────
	_fmt_inr(amount, compact=false) {
		const n=parseFloat(amount)||0, abs=Math.abs(n), sign=n<0?'-':'';
		if (compact) {
			if (abs>=1e7) return sign+'₹'+(abs/1e7).toFixed(2)+' Cr';
			if (abs>=1e5) return sign+'₹'+(abs/1e5).toFixed(2)+' L';
			if (abs>=1e3) return sign+'₹'+(abs/1e3).toFixed(1)+' K';
		}
		return sign+'₹'+abs.toLocaleString('en-IN',{maximumFractionDigits:2});
	}
	_pct(num,den) { if(!den) return '0%'; return (((num||0)/den)*100).toFixed(1)+'%'; }
	_esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
	_set_loading(on) { this.$el&&(on?this.$el.addClass('fd-loading'):this.$el.removeClass('fd-loading')); }

	// ── CSS ───────────────────────────────────────────────────────────────────
	_styles() { return `<style>
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
.fd-cards-info{grid-template-columns:repeat(3,1fr)}
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

/* ═══ SLIDE PANEL ═══ */
#fd-panel-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;justify-content:flex-end;align-items:stretch}
#fd-panel-overlay.open{display:flex}
#fd-panel{background:#f7f8fa;width:min(960px,100vw);height:100vh;max-height:100vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:-8px 0 40px rgba(0,0,0,.2);animation:fd-panel-in .3s cubic-bezier(.22,.68,0,1.15)}
@keyframes fd-panel-in{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}

/* Panel header */
#fd-panel-header{display:flex;align-items:center;gap:14px;padding:0 20px;height:56px;flex-shrink:0;background:#0076B6;border-bottom:1px solid rgba(0,0,0,.1);transition:background .3s}
#fd-panel-close{background:rgba(255,255,255,.15);border:none;cursor:pointer;width:32px;height:32px;border-radius:8px;font-size:18px;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}
#fd-panel-close:hover{background:rgba(255,255,255,.28)}
#fd-panel-title{flex:1;font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fd-panel-header-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
#fd-expand-wrap{display:none;align-items:center;gap:7px;font-size:12px;font-weight:600;color:rgba(255,255,255,.85);cursor:pointer;user-select:none;white-space:nowrap}
#fd-expand-wrap.visible{display:flex}
#fd-expand-cb{width:14px;height:14px;accent-color:#fff;cursor:pointer}

/* Breadcrumb roadmap */
#fd-panel-breadcrumb{flex-shrink:0;background:#fff;border-bottom:1px solid #e4e8ef;padding:8px 16px}
.fd-pnl-crumb{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.fd-pnl-crumb-sep{color:#ccc;font-size:14px;user-select:none}
.fd-pnl-crumb-item{font-size:12px;font-weight:600;color:#999;display:flex;align-items:center;gap:4px}
.fd-pnl-crumb-item.active{color:inherit;font-weight:700}
.fd-pnl-crumb-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}

/* Tab bar */
#fd-panel-sidebar{flex-shrink:0;background:#fff;border-bottom:1px solid #e4e8ef}
#fd-panel-tab-bar{display:flex;align-items:center;overflow-x:auto;padding:0 16px;scrollbar-width:none;gap:0}
#fd-panel-tab-bar::-webkit-scrollbar{display:none}
.fd-tab-item{display:flex;align-items:center;gap:6px;padding:10px 14px;cursor:pointer;font-size:12px;font-weight:600;color:#666;border-bottom:2px solid transparent;white-space:nowrap;transition:color .15s,border-color .15s,background .15s;flex-shrink:0;animation:fd-tab-in .2s ease both}
.fd-tab-item:hover{color:#0076B6;background:#f0f6fb;border-radius:4px 4px 0 0}
.fd-tab-item.active{color:#0076B6;border-bottom-color:#0076B6}
.fd-tab-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
@keyframes fd-tab-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}

/* Summary strip */
#fd-panel-sum-strip{display:flex;align-items:center;gap:20px;padding:6px 16px 8px;background:#f7f9fc;border-top:1px solid #e8edf3;animation:fd-sum-pop .2s ease .2s both;flex-wrap:wrap}
.fd-psum-item{display:flex;flex-direction:column;gap:1px}
.fd-psum-label{font-size:9px;font-weight:700;letter-spacing:.5px;color:#aaa;text-transform:uppercase}
.fd-psum-val{font-size:14px;font-weight:700;color:#003B63}
@keyframes fd-sum-pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}

/* Col header */
#fd-panel-col-hdr{flex-shrink:0;display:grid;background:#0076B6;font-size:11px;font-weight:700;color:#fff;letter-spacing:.3px;text-transform:uppercase;border-bottom:2px solid #005fa3}
#fd-panel-col-hdr>div{padding:10px 12px;border-right:1px solid rgba(255,255,255,.15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fd-panel-col-hdr>div:last-child{border-right:none}

/* Scrollable rows */
#fd-panel-rows{flex:1;overflow-y:auto;min-height:0;background:#f7f8fa}

/* Section header */
.fd-drill-sec-hdr{font-size:11px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:#0076B6;background:#eaf3fb;border-top:2px solid #0076B6;border-bottom:1px solid #c8dff0;margin-top:2px;cursor:pointer;user-select:none;display:grid;align-items:center}
.fd-drill-sec-hdr:first-child{margin-top:0;border-top:none}
.fd-drill-sec-hdr>div{border-right:1px solid #c8dff0}
.fd-drill-sec-hdr>div:last-child{border-right:none}
.fd-drill-sec-hdr.collapsed .fd-sec-toggle{transform:rotate(-90deg)}
.fd-sec-toggle{font-size:10px;color:#0076B6;transition:transform .2s;display:inline-block}

/* Budget header */
.fd-drill-bud-hdr{display:grid;align-items:center;background:#f0f6fb;border-bottom:1px solid #dde8f3;cursor:pointer;user-select:none;transition:background .12s}
.fd-drill-bud-hdr:hover{background:#deeaf5}
.fd-drill-bud-hdr>div{border-right:1px solid #e0eaf3}
.fd-drill-bud-hdr>div:last-child{border-right:none}
.fd-bud-toggle{transition:transform .15s;display:inline-block}
.fd-drill-bud-hdr.collapsed .fd-bud-toggle{transform:rotate(-90deg)!important}

/* Data rows */
.fd-drill-row{display:grid;align-items:stretch;border-bottom:1px solid #e8edf3;font-size:12px;color:#333;transition:background .12s}
.fd-drill-row>div{border-right:1px solid #e8edf3}
.fd-drill-row>div:last-child{border-right:none}
.fd-drill-row:hover:not(.fd-drill-total){background:#f0f5fb}
.fd-drill-hidden{display:none}
.fd-exp-row{background:#fff}
.fd-exp-row:nth-child(even){background:#fafcff}
.fd-mo-row{background:#eff7ff}
.fd-mo-item{background:#f8fafd}

/* Total row */
.fd-drill-total{background:#003B63!important;border-top:2px solid #002a47;border-bottom:3px solid #002a47;position:sticky;bottom:0;z-index:10;animation:fd-total-up .3s ease both}
.fd-drill-total>div{color:#fff!important;font-weight:700;border-right-color:rgba(255,255,255,.15)}
.fd-drill-total>div:last-child{border-right:none}
@keyframes fd-total-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

/* Animations */
.anim-in{animation:fd-row-in .15s ease both}
@keyframes fd-row-in{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}

/* Pill / chips */
.fd-util-pill{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;animation:fd-pill-pop .25s ease both}
@keyframes fd-pill-pop{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
.fd-exp-chip{font-size:9px;background:#f0f2f5;border:1px solid #e0e4ea;border-radius:3px;padding:1px 5px;color:#888;font-weight:600;flex-shrink:0}
.fd-pill{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700}
.fd-pill-yes{background:#dcfce7;color:#166534}
.fd-pill-no{background:#fef3c7;color:#92400e}

/* Loading */
.fd-panel-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px}
.fd-spinner{width:32px;height:32px;border:3px solid #e0e4ea;border-top-color:#0076B6;border-radius:50%;animation:fd-spin .7s linear infinite}
@keyframes fd-spin{to{transform:rotate(360deg)}}

/* Mobile panel */
@media(max-width:900px){
	#fd-panel{width:100vw;height:90vh;max-height:90vh;border-radius:16px 16px 0 0}
	#fd-panel-overlay{align-items:flex-end}
	@keyframes fd-panel-in{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
}
</style>`; }
}
// // frappe.pages['creche_budget_utilisation_summary'].on_page_load = function(wrapper) {
// // 	var page = frappe.ui.make_app_page({
// // 		parent: wrapper,
// // 		title: 'Creche Budget & Utilisation Summary',
// // 		single_column: true
// // 	});
// // }

// frappe.pages['creche_budget_utilisation_summary'].on_page_load = function(wrapper) {

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
// 		this.make();
// 		this.load_data();
// 	}

// 	make() {

// 		this.page.main.html(`

// 			<div class="creche-dashboard">

// 				<div id="summary_cards"
// 					class="row mb-4">
// 				</div>

// 				<div id="partner_container">
// 				</div>

// 			</div>

// 		`);

// 		this.add_styles();
// 	}

// 	add_styles() {

// 		$(`
// 		<style>

// 		.creche-dashboard{
// 			padding:15px;
// 		}

// 		.summary-card{
// 			background:#fff;
// 			border-radius:12px;
// 			padding:20px;
// 			height:130px;
// 			box-shadow:0 2px 10px rgba(0,0,0,.08);
// 			position:relative;
// 			overflow:hidden;
// 		}

// 		.summary-card:before{
// 			content:'';
// 			position:absolute;
// 			left:0;
// 			top:0;
// 			height:100%;
// 			width:5px;
// 		}

// 		.summary-budget:before{
// 			background:#2563eb;
// 		}

// 		.summary-disbursement:before{
// 			background:#16a34a;
// 		}

// 		.summary-utilisation:before{
// 			background:#ea580c;
// 		}

// 		.summary-bank:before{
// 			background:#7c3aed;
// 		}

// 		.summary-interest:before{
// 			background:#dc2626;
// 		}

// 		.card-title{
// 			font-size:12px;
// 			font-weight:700;
// 			color:#6b7280;
// 			text-transform:uppercase;
// 		}

// 		.card-value{
// 			font-size:28px;
// 			font-weight:700;
// 			margin-top:10px;
// 		}

// 		.partner-card{
// 			background:#fff;
// 			border-radius:12px;
// 			margin-bottom:15px;
// 			box-shadow:0 2px 10px rgba(0,0,0,.08);
// 			overflow:hidden;
// 		}

// 		.partner-header{
// 			padding:15px;
// 			background:#f8fafc;
// 			cursor:pointer;
// 			border-left:5px solid #2563eb;
// 		}

// 		.partner-name{
// 			font-size:16px;
// 			font-weight:700;
// 		}

// 		.partner-grants{
// 			color:#64748b;
// 			font-size:12px;
// 			margin-top:5px;
// 		}

// 		.partner-summary{
// 			display:flex;
// 			flex-wrap:wrap;
// 			gap:20px;
// 			margin-top:12px;
// 		}

// 		.partner-summary span{
// 			font-size:13px;
// 		}

// 		.partner-summary b{
// 			color:#1f2937;
// 		}

// 		.partner-details{
// 			display:none;
// 			padding:15px;
// 		}

// 		.finance-table{
// 			font-size:12px;
// 		}

// 		.finance-table th{
// 			background:#f1f5f9;
// 			font-weight:600;
// 			white-space:nowrap;
// 		}

// 		.finance-table td{
// 			white-space:nowrap;
// 			vertical-align:middle;
// 		}

// 		.amount{
// 			text-align:right;
// 		}

// 		.green{
// 			color:#16a34a;
// 			font-weight:600;
// 		}

// 		.orange{
// 			color:#ea580c;
// 			font-weight:600;
// 		}

// 		.red{
// 			color:#dc2626;
// 			font-weight:600;
// 		}

// 		.toggle{
// 			margin-right:8px;
// 		}
// 			.bd-banner-strip{
// 	display:grid;
// 	grid-template-columns:repeat(5,1fr);
// 	gap:12px;
// 	margin-bottom:20px;
// }

// .bd-banner-card{
// 	background:#fff;
// 	border:1px solid #e8edf3;
// 	border-radius:12px;
// 	padding:16px;
// 	border-left:4px solid #378ADD;
// 	box-shadow:0 2px 6px rgba(0,0,0,.05);
// }

// .bd-banner-card.blue{
// 	border-left-color:#2563eb;
// }

// .bd-banner-card.green{
// 	border-left-color:#16a34a;
// }

// .bd-banner-card.orange{
// 	border-left-color:#ea580c;
// }

// .bd-banner-card.purple{
// 	border-left-color:#7c3aed;
// }

// .bd-banner-card.red{
// 	border-left-color:#dc2626;
// }

// .bd-banner-label{
// 	font-size:10px;
// 	font-weight:700;
// 	text-transform:uppercase;
// 	letter-spacing:.6px;
// 	color:#64748b;
// }

// .bd-banner-value{
// 	font-size:24px;
// 	font-weight:700;
// 	margin-top:6px;
// }

// .bd-banner-sub{
// 	font-size:11px;
// 	color:#94a3b8;
// 	margin-top:4px;
// }

// 		</style>
// 		`).appendTo("head");
// 	}

// 	load_data() {

// 		frappe.call({
// 			method: "creche_reports.api.budget_utilisation_summary.get_partner_budget_summary",
// 			freeze: true,
// 			callback: (r) => {

// 				if (!r.message) return;

// 				this.render_cards(r.message.summary);
// 				this.render_partners(r.message.partners);
// 			}
// 		});
// 	}

// render_cards(summary) {

// 	$("#summary_cards").html(`

// 		<div class="bd-banner-strip">

// 			<div class="bd-banner-card blue">
// 				<div class="bd-banner-label">
// 					Total Budget
// 				</div>
// 				<div class="bd-banner-value">
// 					${format_currency(summary.total_budget)}
// 				</div>
// 				<div class="bd-banner-sub">
// 					Approved Budget
// 				</div>
// 			</div>

// 			<div class="bd-banner-card green">
// 				<div class="bd-banner-label">
// 					Total Disbursement
// 				</div>
// 				<div class="bd-banner-value">
// 					${format_currency(summary.total_disbursement)}
// 				</div>
// 				<div class="bd-banner-sub">
// 					Released Amount
// 				</div>
// 			</div>

// 			<div class="bd-banner-card orange">
// 				<div class="bd-banner-label">
// 					Total Utilisation
// 				</div>
// 				<div class="bd-banner-value">
// 					${format_currency(summary.total_utilisation)}
// 				</div>
// 				<div class="bd-banner-sub">
// 					Reported Utilisation
// 				</div>
// 			</div>

// 			<div class="bd-banner-card purple">
// 				<div class="bd-banner-label">
// 					Bank Balance
// 				</div>
// 				<div class="bd-banner-value">
// 					${format_currency(summary.total_bank_balance)}
// 				</div>
// 				<div class="bd-banner-sub">
// 					Current Balance
// 				</div>
// 			</div>

// 			<div class="bd-banner-card red">
// 				<div class="bd-banner-label">
// 					Interest Earned
// 				</div>
// 				<div class="bd-banner-value">
// 					${format_currency(summary.total_interest)}
// 				</div>
// 				<div class="bd-banner-sub">
// 					Bank Interest
// 				</div>
// 			</div>

// 		</div>

// 	`);
// }

// 	get_pct_class(value){

// 		if(value >= 80) return "green";
// 		if(value >= 50) return "orange";
// 		return "red";
// 	}

// 	render_partners(partners){

// 		let html = "";

// 		partners.forEach((partner,index)=>{

// 			html += `

// 			<div class="partner-card">

// 				<div class="partner-header"
// 					data-index="${index}">

// 					<div class="partner-name">

// 						<span class="toggle"
// 							id="icon_${index}">
// 							▶
// 						</span>

// 						${partner.partner_name}

// 					</div>

// 					<div class="partner-grants">

// 						Grant IDs :
// 						${partner.grant_ids || "-"}

// 					</div>

// 					<div class="partner-summary">

// 						<span>
// 							Budget :
// 							<b>${format_currency(partner.total_budget)}</b>
// 						</span>

// 						<span>
// 							Disbursed :
// 							<b>${format_currency(partner.total_disbursement)}</b>
// 						</span>

// 						<span>
// 							Utilised :
// 							<b>${format_currency(partner.total_utilisation)}</b>
// 						</span>

// 						<span>
// 							Balance Budget :
// 							<b>${format_currency(partner.total_balance_budget)}</b>
// 						</span>

// 						<span>
// 							Bank Balance :
// 							<b>${format_currency(partner.total_bank_balance)}</b>
// 						</span>

// 						<span>
// 							Interest :
// 							<b>${format_currency(partner.total_interest)}</b>
// 						</span>

// 						<span>
// 							Utilised :
// 							<b>${partner.utilised_pct}%</b>
// 						</span>

// 					</div>

// 				</div>

// 				<div class="partner-details"
// 					id="detail_${index}">

// 					<div class="table-responsive">

// 						<table class="table table-bordered finance-table">

// 							<thead>
// 								<tr>

// 									<th>Budget Reference Name</th>
// 									<th>State</th>
// 									<th>Grant Start</th>
// 									<th>Grant End</th>
// 									<th>No of Creches</th>

// 									<th>Budget</th>
// 									<th>Disbursed</th>
// 									<th>Utilisation</th>

// 									<th>Utilised %</th>

// 									<th>Utilised % Against Disbursement</th>

// 									<th>Balance Budget Amount</th>

// 									<th>Bank Balance</th>

// 									<th>Interest From Bank</th>

// 								</tr>
// 							</thead>

// 							<tbody>
// 			`;

// 			partner.budgets.forEach(row=>{

// 				html += `

// 				<tr>

// 					<td>${row.budget_reference_name || ""}</td>

// 					<td>${row.state || ""}</td>

// 					<td>${frappe.datetime.str_to_user(row.grant_start)}</td>

// 					<td>${frappe.datetime.str_to_user(row.grant_end)}</td>

// 					<td class="text-center">
// 						${row.no_of_creches || 0}
// 					</td>

// 					<td class="amount">
// 						${format_currency(row.budget)}
// 					</td>

// 					<td class="amount">
// 						${format_currency(row.disbursement)}
// 					</td>

// 					<td class="amount green">
// 						${format_currency(row.utilisation)}
// 					</td>

// 					<td class="amount ${this.get_pct_class(row.utilised_pct)}">
// 						${row.utilised_pct}%
// 					</td>

// 					<td class="amount ${this.get_pct_class(row.utilised_disbursement_pct)}">
// 						${row.utilised_disbursement_pct}%
// 					</td>

// 					<td class="amount">
// 						${format_currency(row.balance_budget_amount)}
// 					</td>

// 					<td class="amount">
// 						${format_currency(row.bank_balance)}
// 					</td>

// 					<td class="amount">
// 						${format_currency(row.interest_from_bank)}
// 					</td>

// 				</tr>
// 				`;
// 			});

// 			html += `
// 							</tbody>
// 						</table>
// 					</div>
// 				</div>
// 			</div>
// 			`;
// 		});

// 		$("#partner_container").html(html);

// 		$(".partner-header").click(function(){

// 			const idx = $(this).data("index");

// 			$("#detail_" + idx).slideToggle();

// 			const icon = $("#icon_" + idx);

// 			icon.text(
// 				icon.text().trim() === "▶"
// 				? "▼"
// 				: "▶"
// 			);
// 		});
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
// 		this.make();
// 		this.load_data();
// 	}

// 	// ─────────────────────────────────────────────
// 	// SCAFFOLD
// 	// ─────────────────────────────────────────────

// 	make() {
// 		this.page.main.html(`
// 			<div class="cbd-root">

// 				<div class="cbd-kpi-grid" id="cbd_kpi_grid"></div>

// 				<div class="cbd-kpi-wide" id="cbd_kpi_wide"></div>

// 				<div class="cbd-section-label">Partners &amp; Grants</div>

// 				<div id="cbd_partners"></div>

// 			</div>
// 		`);

// 		this._inject_styles();
// 	}

// 	// ─────────────────────────────────────────────
// 	// DATA
// 	// ─────────────────────────────────────────────

// 	load_data() {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
// 			freeze: true,
// 			freeze_message: 'Loading budget summary…',
// 			callback: (r) => {
// 				if (!r.message) return;
// 				this.render_kpis(r.message.summary);
// 				this.render_partners(r.message.partners);
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// KPI CARDS
// 	// ─────────────────────────────────────────────

// 	render_kpis(s) {

// 		const top_cards = [
// 			{ label: 'Total Budget',    value: this._fmt(s.total_budget),       sub: 'Approved budget',      accent: 'blue'   },
// 			{ label: 'Disbursement',    value: this._fmt(s.total_disbursement),  sub: 'Released amount',      accent: 'green'  },
// 			{ label: 'Utilisation',     value: this._fmt(s.total_utilisation),   sub: 'Reported utilisation', accent: 'amber'  },
// 			{ label: 'Bank Balance',    value: this._fmt(s.total_bank_balance),  sub: 'Current balance',      accent: 'purple' },
// 			{ label: 'Interest Earned', value: this._fmt(s.total_interest),      sub: 'Bank interest',        accent: 'red'    },
// 		];

// 		document.getElementById('cbd_kpi_grid').innerHTML =
// 			top_cards.map(c => `
// 				<div class="cbd-kpi cbd-kpi--${c.accent}">
// 					<div class="cbd-kpi__label">${c.label}</div>
// 					<div class="cbd-kpi__value">${c.value}</div>
// 					<div class="cbd-kpi__sub">${c.sub}</div>
// 				</div>
// 			`).join('');

// 		const u_pct = parseFloat(s.utilisation_pct)  || 0;
// 		const d_pct = parseFloat(s.disbursement_pct) || 0;

// 		document.getElementById('cbd_kpi_wide').innerHTML = `
// 			<div class="cbd-kpi cbd-kpi--teal">
// 				<div class="cbd-kpi__label">Utilisation Rate</div>
// 				<div class="cbd-kpi__value">${u_pct.toFixed(1)}%</div>
// 				<div class="cbd-kpi__sub">of total approved budget</div>
// 				<div class="cbd-prog">
// 					<div class="cbd-prog__fill cbd-prog__fill--${this._fill_cls(u_pct)}"
// 						style="width:${Math.min(u_pct, 100)}%"></div>
// 				</div>
// 			</div>
// 			<div class="cbd-kpi cbd-kpi--teal">
// 				<div class="cbd-kpi__label">Disbursement Rate</div>
// 				<div class="cbd-kpi__value">${d_pct.toFixed(1)}%</div>
// 				<div class="cbd-kpi__sub">of total approved budget</div>
// 				<div class="cbd-prog">
// 					<div class="cbd-prog__fill cbd-prog__fill--blue"
// 						style="width:${Math.min(d_pct, 100)}%"></div>
// 				</div>
// 			</div>
// 		`;
// 	}

// 	// ─────────────────────────────────────────────
// 	// PARTNER ACCORDIONS
// 	// ─────────────────────────────────────────────

// 	render_partners(partners) {

// 		const el = document.getElementById('cbd_partners');

// 		if (!partners || !partners.length) {
// 			el.innerHTML = '<div class="cbd-empty">No partner data available.</div>';
// 			return;
// 		}

// 		el.innerHTML = '';

// 		partners.forEach((partner, idx) => {

// 			const u_pct    = parseFloat(partner.utilised_pct) || 0;
// 			const badge_cls = this._badge_cls(u_pct);
// 			const fill_cls  = this._fill_cls(u_pct);

// 			const card = document.createElement('div');
// 			card.className = 'cbd-partner';

// 			card.innerHTML = `
// 				<div class="cbd-partner__head" id="cbd_ph_${idx}">

// 					<div class="cbd-partner__left">

// 						<div class="cbd-partner__name">
// 							${this._icon_partner()}
// 							${frappe.utils.escape_html(partner.partner_name || '—')}
// 						</div>

// 						<div class="cbd-partner__meta">
// 							Grants: ${frappe.utils.escape_html(partner.grant_ids || '—')}
// 						</div>

// 						<div class="cbd-partner__pills">
// 							${this._pill('Budget',        this._fmt(partner.total_budget))}
// 							${this._pill('Disbursed',     this._fmt(partner.total_disbursement))}
// 							${this._pill('Utilised',      this._fmt(partner.total_utilisation))}
// 							${this._pill('Bal. Budget',   this._fmt(partner.total_balance_budget))}
// 							${this._pill('Bank Bal.',     this._fmt(partner.total_bank_balance))}
// 							${this._pill('Interest',      this._fmt(partner.total_interest))}
// 							${this._pill('Total Creches', this._total_creches(partner.budgets))}

// 							<div class="cbd-tag-group">
// 								<span class="cbd-tag-group__label">
// 									${this._icon_pin()} States
// 								</span>
// 								<div class="cbd-tag-group__items">
// 									${this._state_tags(partner.budgets)}
// 								</div>
// 							</div>

// 							<div class="cbd-tag-group">
// 								<span class="cbd-tag-group__label">
// 									${this._icon_doc()} Budget Refs
// 								</span>
// 								<div class="cbd-tag-group__items">
// 									${this._ref_tags(partner.budgets)}
// 								</div>
// 							</div>

// 						</div>

// 						<div class="cbd-prog" style="margin-top:10px">
// 							<div class="cbd-prog__fill cbd-prog__fill--${fill_cls}"
// 								style="width:${Math.min(u_pct, 100)}%"></div>
// 						</div>

// 					</div>

// 					<div class="cbd-partner__right">
// 						<div class="cbd-badge cbd-badge--${badge_cls}">
// 							${u_pct.toFixed(1)}% utilised
// 						</div>
// 						<div class="cbd-chevron" id="cbd_chv_${idx}">&#9654;</div>
// 					</div>

// 				</div>

// 				<div class="cbd-partner__body" id="cbd_pb_${idx}">
// 					${this._build_table(partner.budgets || [], partner.partner_name || '')}
// 				</div>
// 			`;

// 			el.appendChild(card);

// 			card.querySelector(`#cbd_ph_${idx}`).addEventListener('click', () => {
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

// 		if (!budgets.length) {
// 			return '<div class="cbd-empty">No budget rows.</div>';
// 		}

// 		const rows = budgets.map(r => {

// 			const u_pct  = parseFloat(r.utilised_pct)             || 0;
// 			const ud_pct = parseFloat(r.utilised_disbursement_pct) || 0;

// 			return `
// 				<tr>
// 					<td>
// 						<span class="cbd-chip cbd-chip--blue">
// 							${frappe.utils.escape_html(r.budget_reference_name || '—')}
// 						</span>
// 					</td>
// 					<td>
// 						<span class="cbd-chip cbd-chip--teal">
// 							${frappe.utils.escape_html(r.grant_id || '—')}
// 						</span>
// 					</td>
// 					<td>${frappe.utils.escape_html(r.financial_year || '—')}</td>
// 					<td>${frappe.utils.escape_html(r.state || '—')}</td>
// 					<td>${this._date(r.grant_start)}</td>
// 					<td>${this._date(r.grant_end)}</td>
// 					<td class="cbd-r">${r.no_of_creches || 0}</td>
// 					<td class="cbd-r">${this._fmt(r.budget)}</td>
// 					<td class="cbd-r">${this._fmt(r.disbursement)}</td>
// 					<td class="cbd-r">${this._fmt(r.utilisation)}</td>
// 					<td class="cbd-r">
// 						<span class="cbd-chip cbd-chip--${this._chip_cls(u_pct)}">
// 							${u_pct.toFixed(1)}%
// 						</span>
// 					</td>
// 					<td class="cbd-r">
// 						<span class="cbd-chip cbd-chip--${this._chip_cls(ud_pct)}">
// 							${ud_pct.toFixed(1)}%
// 						</span>
// 					</td>
// 					<td class="cbd-r">${this._fmt(r.balance_budget_amount)}</td>
// 					<td class="cbd-r">${this._fmt(r.bank_balance)}</td>
// 					<td class="cbd-r">${this._fmt(r.interest_from_bank)}</td>
// 				</tr>
// 			`;
// 		}).join('');

// 		return `
// 			<div class="cbd-tbl-wrap">
// 				<table class="cbd-table" role="table"
// 					aria-label="Budget rows for ${frappe.utils.escape_html(partner_name)}">
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
// 						</tr>
// 					</thead>
// 					<tbody>${rows}</tbody>
// 				</table>
// 			</div>
// 		`;
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

// 	_pill(label, value) {
// 		return `
// 			<div class="cbd-pill">
// 				<span class="cbd-pill__label">${label}</span>
// 				<span class="cbd-pill__value">${value}</span>
// 			</div>
// 		`;
// 	}

// 	_icon_partner() {
// 		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
// 			stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round"
// 			stroke-linejoin="round" style="flex-shrink:0;vertical-align:middle">
// 			<rect x="3" y="7" width="18" height="14" rx="1"/>
// 			<path d="M8 21V11h8v10"/><path d="M3 7l9-4 9 4"/>
// 		</svg>`;
// 	}

// 	_total_creches(budgets) {
// 		return (budgets || []).reduce((sum, b) => sum + (parseInt(b.no_of_creches) || 0), 0);
// 	}

// 	_state_tags(budgets) {
// 		const states = [...new Set((budgets || []).map(b => b.state).filter(Boolean))].sort();
// 		if (!states.length) return '<span class="cbd-tag cbd-tag--gray">—</span>';
// 		return states.map(s =>
// 			`<span class="cbd-tag cbd-tag--blue">${frappe.utils.escape_html(s)}</span>`
// 		).join('');
// 	}

// 	_ref_tags(budgets) {
// 		const refs = [...new Set((budgets || []).map(b => b.budget_reference_name).filter(Boolean))].sort();
// 		if (!refs.length) return '<span class="cbd-tag cbd-tag--gray">—</span>';
// 		return refs.map(r =>
// 			`<span class="cbd-tag cbd-tag--purple">${frappe.utils.escape_html(r)}</span>`
// 		).join('');
// 	}

// 	_icon_pin() {
// 		return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
// 			stroke="currentColor" stroke-width="2" stroke-linecap="round"
// 			stroke-linejoin="round" style="vertical-align:middle;margin-right:3px">
// 			<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
// 			<circle cx="12" cy="9" r="2.5"/>
// 		</svg>`;
// 	}

// 	_icon_doc() {
// 		return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
// 			stroke="currentColor" stroke-width="2" stroke-linecap="round"
// 			stroke-linejoin="round" style="vertical-align:middle;margin-right:3px">
// 			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
// 			<polyline points="14 2 14 8 20 8"/>
// 			<line x1="16" y1="13" x2="8" y2="13"/>
// 			<line x1="16" y1="17" x2="8" y2="17"/>
// 		</svg>`;
// 	}

// 	_fill_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
// 	_chip_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
// 	_badge_cls(v) { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }

// 	// ─────────────────────────────────────────────
// 	// STYLES
// 	// ─────────────────────────────────────────────

// 	_inject_styles() {
// 		if (document.getElementById('cbd-styles')) return;

// 		const style = document.createElement('style');
// 		style.id = 'cbd-styles';
// 		style.textContent = `

// 		/* ── Root ──────────────────────────────── */
// 		.cbd-root {
// 			padding: 16px 20px 40px;
// 		}

// 		/* ── KPI grid (5 cols) ──────────────────── */
// 		.cbd-kpi-grid {
// 			display: grid;
// 			grid-template-columns: repeat(5, 1fr);
// 			gap: 10px;
// 			margin-bottom: 10px;
// 		}

// 		/* ── KPI wide (2 cols) ──────────────────── */
// 		.cbd-kpi-wide {
// 			display: grid;
// 			grid-template-columns: 1fr 1fr;
// 			gap: 10px;
// 			margin-bottom: 24px;
// 		}

// 		/* ── KPI card ───────────────────────────── */
// 		.cbd-kpi {
// 			background: var(--card-bg, #fff);
// 			border: 1px solid var(--border-color, #d1d8dd);
// 			border-radius: 10px;
// 			padding: 14px 16px 13px;
// 			border-top: 3px solid transparent;
// 		}

// 		.cbd-kpi--blue   { border-top-color: #378ADD; }
// 		.cbd-kpi--green  { border-top-color: #639922; }
// 		.cbd-kpi--amber  { border-top-color: #BA7517; }
// 		.cbd-kpi--purple { border-top-color: #7F77DD; }
// 		.cbd-kpi--red    { border-top-color: #E24B4A; }
// 		.cbd-kpi--teal   { border-top-color: #1D9E75; }

// 		.cbd-kpi__label {
// 			font-size: 10px;
// 			font-weight: 600;
// 			text-transform: uppercase;
// 			letter-spacing: .7px;
// 			color: var(--text-muted, #8d99a6);
// 		}
// 		.cbd-kpi__value {
// 			font-size: 22px;
// 			font-weight: 600;
// 			color: var(--text-color, #1c2126);
// 			margin-top: 6px;
// 			line-height: 1.1;
// 		}
// 		.cbd-kpi__sub {
// 			font-size: 11px;
// 			color: var(--text-muted, #8d99a6);
// 			margin-top: 4px;
// 		}

// 		/* ── Progress bar ───────────────────────── */
// 		.cbd-prog {
// 			height: 4px;
// 			background: var(--border-color, #d1d8dd);
// 			border-radius: 2px;
// 			margin-top: 10px;
// 			overflow: hidden;
// 		}
// 		.cbd-prog__fill {
// 			height: 100%;
// 			border-radius: 2px;
// 			transition: width .5s ease;
// 		}
// 		.cbd-prog__fill--green { background: #639922; }
// 		.cbd-prog__fill--amber { background: #BA7517; }
// 		.cbd-prog__fill--red   { background: #E24B4A; }
// 		.cbd-prog__fill--blue  { background: #378ADD; }

// 		/* ── Section label ──────────────────────── */
// 		.cbd-section-label {
// 			font-size: 10px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .9px;
// 			color: var(--text-muted, #8d99a6);
// 			margin-bottom: 10px;
// 		}

// 		/* ── Partner accordion ──────────────────── */
// 		.cbd-partner {
// 			background: var(--card-bg, #fff);
// 			border: 1px solid var(--border-color, #d1d8dd);
// 			border-radius: 10px;
// 			margin-bottom: 10px;
// 			overflow: hidden;
// 		}

// 		.cbd-partner__head {
// 			display: flex;
// 			align-items: flex-start;
// 			justify-content: space-between;
// 			padding: 14px 18px;
// 			cursor: pointer;
// 			gap: 16px;
// 			border-left: 3px solid #378ADD;
// 		}
// 		.cbd-partner__head:hover {
// 			background: var(--control-bg, #f7f7f7);
// 		}

// 		.cbd-partner__left {
// 			flex: 1;
// 			min-width: 0;
// 		}

// 		.cbd-partner__name {
// 			font-size: 14px;
// 			font-weight: 600;
// 			color: var(--text-color, #1c2126);
// 			display: flex;
// 			align-items: center;
// 			gap: 7px;
// 		}
// 		.cbd-partner__meta {
// 			font-size: 11px;
// 			color: var(--text-muted, #8d99a6);
// 			margin-top: 3px;
// 			padding-left: 23px;
// 		}

// 		/* ── Metric pills ───────────────────────── */
// 		.cbd-partner__pills {
// 			display: flex;
// 			flex-wrap: wrap;
// 			gap: 6px;
// 			margin-top: 10px;
// 		}
// 		.cbd-pill {
// 			display: inline-flex;
// 			flex-direction: column;
// 			background: var(--control-bg, #f7f7f7);
// 			border: 1px solid var(--border-color, #d1d8dd);
// 			border-radius: 6px;
// 			padding: 5px 10px;
// 			min-width: 84px;
// 		}
// 		.cbd-pill__label {
// 			font-size: 9px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .5px;
// 			color: var(--text-muted, #8d99a6);
// 		}
// 		.cbd-pill__value {
// 			font-size: 13px;
// 			font-weight: 600;
// 			color: var(--text-color, #1c2126);
// 			margin-top: 2px;
// 		}

// 		/* ── Right side of header ───────────────── */
// 		.cbd-partner__right {
// 			display: flex;
// 			flex-direction: column;
// 			align-items: flex-end;
// 			gap: 10px;
// 			flex-shrink: 0;
// 			padding-top: 2px;
// 		}

// 		.cbd-badge {
// 			display: inline-flex;
// 			align-items: center;
// 			border-radius: 6px;
// 			padding: 4px 10px;
// 			font-size: 12px;
// 			font-weight: 600;
// 			white-space: nowrap;
// 		}
// 		.cbd-badge--green { background: #EAF3DE; color: #3B6D11; }
// 		.cbd-badge--amber { background: #FAEEDA; color: #854F0B; }
// 		.cbd-badge--red   { background: #FCEBEB; color: #A32D2D; }

// 		.cbd-chevron {
// 			font-size: 11px;
// 			color: var(--text-muted, #8d99a6);
// 			transition: transform .2s ease;
// 			line-height: 1;
// 		}
// 		.cbd-chevron--open {
// 			transform: rotate(90deg);
// 		}

// 		/* ── Partner body ───────────────────────── */
// 		.cbd-partner__body {
// 			display: none;
// 			border-top: 1px solid var(--border-color, #d1d8dd);
// 		}

// 		/* ── Table ──────────────────────────────── */
// 		.cbd-tbl-wrap {
// 			overflow-x: auto;
// 		}

// 		.cbd-table {
// 			width: 100%;
// 			border-collapse: collapse;
// 			font-size: 12px;
// 			white-space: nowrap;
// 		}

// 		.cbd-table thead {
// 			position: sticky;
// 			top: 0;
// 			z-index: 1;
// 		}

// 		.cbd-table th {
// 			padding: 9px 12px;
// 			text-align: left;
// 			font-size: 10px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .5px;
// 			color: var(--text-muted, #8d99a6);
// 			background: var(--control-bg, #f7f7f7);
// 			border-bottom: 1px solid var(--border-color, #d1d8dd);
// 		}

// 		.cbd-table td {
// 			padding: 8px 12px;
// 			color: var(--text-color, #1c2126);
// 			border-bottom: 1px solid var(--border-color, #d1d8dd);
// 			vertical-align: middle;
// 		}

// 		.cbd-table tr:last-child td {
// 			border-bottom: none;
// 		}

// 		.cbd-table tbody tr:hover td {
// 			background: var(--control-bg, #f7f7f7);
// 		}

// 		.cbd-r {
// 			text-align: right !important;
// 		}

// 		/* ── Chips ──────────────────────────────── */
// 		.cbd-chip {
// 			display: inline-flex;
// 			align-items: center;
// 			border-radius: 4px;
// 			padding: 2px 7px;
// 			font-size: 11px;
// 			font-weight: 600;
// 		}
// 		.cbd-chip--blue  { background: #E6F1FB; color: #185FA5; }
// 		.cbd-chip--teal  { background: #E1F5EE; color: #0F6E56; }
// 		.cbd-chip--green { background: #EAF3DE; color: #3B6D11; }
// 		.cbd-chip--amber { background: #FAEEDA; color: #854F0B; }
// 		.cbd-chip--red   { background: #FCEBEB; color: #A32D2D; }

// 		/* ── Tag rows (states / refs) ───────────── */
// 		.cbd-partner__tags-row {
// 			display: none;
// 		}

// 		.cbd-tag-group {
// 			display: inline-flex;
// 			align-items: center;
// 			gap: 5px;
// 			background: var(--control-bg, #f7f7f7);
// 			border: 1px solid var(--border-color, #d1d8dd);
// 			border-radius: 6px;
// 			padding: 5px 10px;
// 		}

// 		.cbd-tag-group__label {
// 			font-size: 9px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .5px;
// 			color: var(--text-muted, #8d99a6);
// 			white-space: nowrap;
// 			display: flex;
// 			align-items: center;
// 			gap: 3px;
// 		}

// 		.cbd-tag-group__items {
// 			display: flex;
// 			flex-wrap: wrap;
// 			gap: 3px;
// 		}

// 		.cbd-tag {
// 			display: inline-flex;
// 			align-items: center;
// 			border-radius: 3px;
// 			padding: 1px 6px;
// 			font-size: 11px;
// 			font-weight: 600;
// 		}

// 		.cbd-tag--blue   { background: #E6F1FB; color: #185FA5; }
// 		.cbd-tag--purple { background: #EEEDFE; color: #534AB7; }
// 		.cbd-tag--gray   { background: var(--control-bg, #f7f7f7); color: var(--text-muted, #8d99a6); }

// 		/* ── Empty ──────────────────────────────── */
// 		.cbd-empty {
// 			padding: 24px;
// 			text-align: center;
// 			color: var(--text-muted, #8d99a6);
// 			font-size: 13px;
// 		}

// 		`;
// 		document.head.appendChild(style);
// 	}
// }












//  last working code====================================
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
// 		this.make();
// 		this.load_data();
// 	}

// 	// ─────────────────────────────────────────────
// 	// SCAFFOLD
// 	// ─────────────────────────────────────────────

// 	make() {
// 		this.page.main.html(`
// 			<div class="cbd-root">
// 				<div class="cbd-kpi-grid" id="cbd_kpi_grid"></div>
// 				<div class="cbd-kpi-wide"  id="cbd_kpi_wide"></div>
// 				<div class="cbd-section-label">Partners &amp; Grants</div>
// 				<div id="cbd_partners"></div>
// 			</div>
// 		`);
// 		this._inject_styles();
// 		this._ensure_panels();
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
// 		document.body.appendChild(overlay);
// 		document.body.appendChild(left);
// 		document.body.appendChild(right);
// 		overlay.addEventListener('click', () => this._close_panels());
// 	}

// 	// ─────────────────────────────────────────────
// 	// DATA
// 	// ─────────────────────────────────────────────

// 	load_data() {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
// 			freeze: true,
// 			freeze_message: 'Loading budget summary…',
// 			callback: (r) => {
// 				if (!r.message) return;
// 				this.render_kpis(r.message.summary);
// 				this.render_partners(r.message.partners);
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// KPI CARDS
// 	// ─────────────────────────────────────────────

// 	render_kpis(s) {
// 		const top_cards = [
// 			{ label: 'Total Budget',    value: this._fmt(s.total_budget),      sub: 'Approved budget',      accent: 'blue'   },
// 			{ label: 'Disbursement',    value: this._fmt(s.total_disbursement), sub: 'Released amount',      accent: 'green'  },
// 			{ label: 'Utilisation',     value: this._fmt(s.total_utilisation),  sub: 'Reported utilisation', accent: 'amber'  },
// 			{ label: 'Bank Balance',    value: this._fmt(s.total_bank_balance), sub: 'Current balance',      accent: 'purple' },
// 			{ label: 'Interest Earned', value: this._fmt(s.total_interest),     sub: 'Bank interest',        accent: 'red'    },
// 		];
// 		document.getElementById('cbd_kpi_grid').innerHTML =
// 			top_cards.map(c => `
// 				<div class="cbd-kpi cbd-kpi--${c.accent}">
// 					<div class="cbd-kpi__label">${c.label}</div>
// 					<div class="cbd-kpi__value">${c.value}</div>
// 					<div class="cbd-kpi__sub">${c.sub}</div>
// 				</div>
// 			`).join('');

// 		const u_pct = parseFloat(s.utilisation_pct)  || 0;
// 		const d_pct = parseFloat(s.disbursement_pct) || 0;
// 		document.getElementById('cbd_kpi_wide').innerHTML = `
// 			<div class="cbd-kpi cbd-kpi--teal">
// 				<div class="cbd-kpi__label">Utilisation Rate</div>
// 				<div class="cbd-kpi__value">${u_pct.toFixed(1)}%</div>
// 				<div class="cbd-kpi__sub">of total approved budget</div>
// 				<div class="cbd-prog"><div class="cbd-prog__fill cbd-prog__fill--${this._fill_cls(u_pct)}" style="width:${Math.min(u_pct,100)}%"></div></div>
// 			</div>
// 			<div class="cbd-kpi cbd-kpi--teal">
// 				<div class="cbd-kpi__label">Disbursement Rate</div>
// 				<div class="cbd-kpi__value">${d_pct.toFixed(1)}%</div>
// 				<div class="cbd-kpi__sub">of total approved budget</div>
// 				<div class="cbd-prog"><div class="cbd-prog__fill cbd-prog__fill--blue" style="width:${Math.min(d_pct,100)}%"></div></div>
// 			</div>
// 		`;
// 	}

// 	// ─────────────────────────────────────────────
// 	// PARTNER ACCORDIONS
// 	// ─────────────────────────────────────────────

// 	render_partners(partners) {
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_left">&#10005; Close both</button>
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_right">&#10005; Close both</button>
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
// 		document.getElementById('cbd_close_both_left').addEventListener('click',  () => this._close_panels());
// 		document.getElementById('cbd_close_both_right').addEventListener('click', () => this._close_panels());

// 		this._load_budget_items(budget_id);
// 		this._load_utilisation_items(budget_id, grant_start, grant_end);
// 	}

// 	_close_panels() {
// 		document.getElementById('cbd_overlay').classList.remove('cbd-overlay--active');
// 		document.getElementById('cbd_panel_left').classList.remove('cbd-panel--open');
// 		document.getElementById('cbd_panel_right').classList.remove('cbd-panel--open');
// 		document.body.classList.remove('cbd-panels-open');
// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
// 		if (sidebar) sidebar.style.zIndex = sidebar.dataset.cbdPrevZ || '';
// 	}

// 	_close_left() {
// 		const left  = document.getElementById('cbd_panel_left');
// 		const right = document.getElementById('cbd_panel_right');
// 		left.classList.remove('cbd-panel--open');
// 		if (!right.classList.contains('cbd-panel--open')) this._close_panels();
// 	}

// 	_close_right() {
// 		const left  = document.getElementById('cbd_panel_left');
// 		const right = document.getElementById('cbd_panel_right');
// 		right.classList.remove('cbd-panel--open');
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_left">&#10005; Close both</button>
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_right">&#10005; Close both</button>
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
// 		document.getElementById('cbd_close_both_left').addEventListener('click',  () => this._close_panels());
// 		document.getElementById('cbd_close_both_right').addEventListener('click', () => this._close_panels());

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

// 		/* ── KPI grids ──────────────────────────── */
// 		.cbd-kpi-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:10px; }
// 		.cbd-kpi-wide { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:24px; }

// 		.cbd-kpi {
// 			background: var(--card-bg,#fff);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			border-radius: 10px;
// 			padding: 14px 16px 13px;
// 			border-top: 3px solid transparent;
// 		}
// 		.cbd-kpi--blue   { border-top-color:#378ADD; }
// 		.cbd-kpi--green  { border-top-color:#639922; }
// 		.cbd-kpi--amber  { border-top-color:#BA7517; }
// 		.cbd-kpi--purple { border-top-color:#7F77DD; }
// 		.cbd-kpi--red    { border-top-color:#E24B4A; }
// 		.cbd-kpi--teal   { border-top-color:#1D9E75; }
// 		.cbd-kpi__label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.7px; color:var(--text-muted,#8d99a6); }
// 		.cbd-kpi__value { font-size:22px; font-weight:600; color:var(--text-color,#1c2126); margin-top:6px; line-height:1.1; }
// 		.cbd-kpi__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:4px; }

// 		/* ── Progress ───────────────────────────── */
// 		.cbd-prog { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; margin-top:10px; overflow:hidden; }
// 		.cbd-prog__fill { height:100%; border-radius:2px; transition:width .5s ease; }
// 		.cbd-prog__fill--green { background:#639922; }
// 		.cbd-prog__fill--amber { background:#BA7517; }
// 		.cbd-prog__fill--red   { background:#E24B4A; }
// 		.cbd-prog__fill--blue  { background:#378ADD; }

// 		/* ── Section label ──────────────────────── */
// 		.cbd-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.9px; color:var(--text-muted,#8d99a6); margin-bottom:10px; }

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
// 		.cbd-table { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; }
// 		.cbd-table thead { position:sticky; top:0; z-index:1; }
// 		.cbd-table th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); border-bottom:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-table td { padding:8px 12px; color:var(--text-color,#1c2126); border-bottom:1px solid var(--border-color,#d1d8dd); vertical-align:middle; }
// 		.cbd-table tr:last-child td { border-bottom:none; }
// 		.cbd-table tbody tr:hover td { background:var(--control-bg,#f7f7f7); }
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
// 		.cbd-close-both-btn {
// 			display: inline-flex;
// 			align-items: center;
// 			gap: 4px;
// 			padding: 4px 10px;
// 			font-size: 11px;
// 			font-weight: 600;
// 			color: #A32D2D;
// 			background: #FCEBEB;
// 			border: 1px solid #F09595;
// 			border-radius: 5px;
// 			cursor: pointer;
// 			white-space: nowrap;
// 			transition: background .15s;
// 		}
// 		.cbd-close-both-btn:hover { background: #F7C1C1; }

// 		/* ── Line items table ───────────────────── */
// 		.cbd-li-table {
// 			width: 100%;
// 			border-collapse: collapse;
// 			font-size: 12px;
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
// 			border-bottom: 1px solid var(--border-color,#d1d8dd);
// 			white-space: nowrap;
// 		}
// 		.cbd-li-table td {
// 			padding: 6px 10px;
// 			color: var(--text-color,#1c2126);
// 			border-bottom: 1px solid var(--border-color,#d1d8dd);
// 			vertical-align: middle;
// 		}
// 		.cbd-li-table tr:last-child td { border-bottom: none; }
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

// 		/* ── Empty ──────────────────────────────── */
// 		.cbd-empty { padding:24px; text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; }

// 		`;
// 		document.head.appendChild(style);

// 		// bind delegation after DOM is ready
// 		setTimeout(() => this._bind_view_buttons(), 0);
// 	}
// }























// last working -----
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
// 		this.make();
// 		this.load_data();
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
// 		this.page.set_primary_action('Apply', () => this.load_data(this._get_filter_values()), 'filter');

// 		this._inject_styles();
// 		this._ensure_panels();
// 		this._build_filters();
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
// 					return frappe.db.get_list('Creche Partners', {
// 						fields: ['name', 'partner_name'],
// 						filters: txt ? { partner_name: ['like', `%${txt}%`] } : {},
// 						limit: 50,
// 					}).then(rows => rows.map(r => ({
// 						value:       r.name,                  // ID passed to API
// 						label:       r.partner_name || r.name, // shown in dropdown
// 						description: r.name,                  // shown as pill subtitle
// 					})));
// 				},
// 				change: () => {
// 					// Reset dependent fields when partner changes
// 					['budget_ref', 'grant_id', 'state', 'district', 'block'].forEach(k => {
// 						const f = this._fields[k];
// 						if (f) f.set_value([]);
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
// 					const partners = (this._fields.partner_id?.get_value() || []);
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
// 					const partners = (this._fields.partner_id?.get_value() || []);
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
// 					const partners = (this._fields.partner_id?.get_value() || []);
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
// 					const partners = (this._fields.partner_id?.get_value() || []);
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
// 					const partners = (this._fields.partner_id?.get_value() || []);
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
// 			const arr = this._get_val(k);
// 			if (arr.length) v[k] = arr;
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
// 				label:  'Bank & Cash Balance',
// 				value:  this._fmt(s.total_bank_balance),
// 				sub:    'End of period',
// 				accent: 'purple',
// 				panel:  'both',
// 				drill:  'View line items →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>`,
// 			},
// 			{
// 				label:  'Interest from Bank',
// 				value:  this._fmt(s.total_interest),
// 				sub:    'Earned interest',
// 				accent: 'amber',
// 				panel:  'both',
// 				drill:  'View line items →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_left">&#10005; Close both</button>
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_right">&#10005; Close both</button>
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
// 		}

// 		// Wire close buttons
// 		const wire = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', fn); };
// 		wire('cbd_close_panels',    () => this._close_left());
// 		wire('cbd_close_panels2',   () => this._close_right());
// 		wire('cbd_close_both_left', () => this._close_panels());
// 		wire('cbd_close_both_right',() => this._close_panels());

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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_left">&#10005; Close both</button>
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_right">&#10005; Close both</button>
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
// 		document.getElementById('cbd_close_both_left').addEventListener('click',  () => this._close_panels());
// 		document.getElementById('cbd_close_both_right').addEventListener('click', () => this._close_panels());

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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_left">&#10005; Close both</button>
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
// 					<button class="cbd-close-both-btn" id="cbd_close_both_right">&#10005; Close both</button>
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
// 		document.getElementById('cbd_close_both_left').addEventListener('click',  () => this._close_panels());
// 		document.getElementById('cbd_close_both_right').addEventListener('click', () => this._close_panels());

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
// 		.cbd-close-both-btn {
// 			display: inline-flex;
// 			align-items: center;
// 			gap: 4px;
// 			padding: 4px 10px;
// 			font-size: 11px;
// 			font-weight: 600;
// 			color: #A32D2D;
// 			background: #FCEBEB;
// 			border: 1px solid #F09595;
// 			border-radius: 5px;
// 			cursor: pointer;
// 			white-space: nowrap;
// 			transition: background .15s;
// 		}
// 		.cbd-close-both-btn:hover { background: #F7C1C1; }

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
		this.make();
		this.load_data();
	}

	// ─────────────────────────────────────────────
	// SCAFFOLD
	// ─────────────────────────────────────────────

	make() {
		this.page.main.html(`
			<div class="cbd-root">
				<div class="cbd-overview-strip" id="cbd_overview_strip" style="display:none"></div>
				<div class="cbd-summary-cards" id="cbd_summary_cards"></div>
				<div class="cbd-section-label">Partners &amp; Grants</div>
				<div id="cbd_partners"></div>
			</div>
		`);

		// Apply + Clear in the Frappe page title bar (top right)
		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
		this.page.set_primary_action('Apply', () => this.load_data(this._get_filter_values()), 'filter');

		this._inject_styles();
		this._ensure_panels();
		this._build_filters();
	}


	// ─────────────────────────────────────────────
	// FILTERS  — exact same pattern as reference code
	// ─────────────────────────────────────────────

	_build_filters() {
		const $root = $(this.page.main).find('.cbd-root');

		// Row 1
		const $row1 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow1"></div>`).prependTo($root);
		// Row 2
		const $row2 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow2"></div>`).insertAfter($row1);
		this._fields = {};
		this._sel    = {};

		// Make a col helper — equal 20% width per col (5 per row)
		const col = ($row, key) => {
			const $c = $(`<div class="cbd-filter-col col-sm-12" id="cbd_fcol_${key}"></div>`).appendTo($row);
			return $c;
		};

		// ── ROW 1 ─────────────────────────────────────────────────
		// Partner — MultiSelectList, options loaded async
		const partner_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'partner_id'),
			df: {
				label: 'Partner', fieldtype: 'MultiSelectList', fieldname: 'partner_id',
				get_data: (txt) => {
					return frappe.db.get_list('Creche Partners', {
						fields: ['name', 'partner_name'],
						filters: txt ? { partner_name: ['like', `%${txt}%`] } : {},
						limit: 50,
					}).then(rows => rows.map(r => ({
						value:       r.name,                  // ID passed to API
						label:       r.partner_name || r.name, // shown in dropdown
						description: r.name,                  // shown as pill subtitle
					})));
				},
				change: () => {
					// Reset dependent fields when partner changes
					['budget_ref', 'grant_id', 'state', 'district', 'block'].forEach(k => {
						const f = this._fields[k];
						if (f) f.set_value([]);
					});
					this._sel.partner_id = partner_ctrl.get_value() || [];
					this._on_filter_change('partner_id');
				},
			},
			render_input: true,
		});
		partner_ctrl.refresh();
		this._fields.partner_id = partner_ctrl;

		// Budget Reference — MultiSelectList, filtered by partner
		const budget_ref_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'budget_ref'),
			df: {
				label: 'Budget Reference', fieldtype: 'MultiSelectList', fieldname: 'budget_ref',
				get_data: (txt) => {
					const partners = (this._fields.partner_id?.get_value() || []);
					const filters = {};
					if (partners.length) filters.partner_id = ['in', partners];
					if (txt) filters.budget_reference_name = ['like', `%${txt}%`];
					return frappe.db.get_list('Creche Budget', { filters, fields: ['budget_reference_name'], limit: 50 })
						.then(rows => [...new Set(rows.map(r => r.budget_reference_name).filter(Boolean))]
							.map(v => ({ value: v, description: '' })));
				},
				change: () => { this._sel.budget_ref = budget_ref_ctrl.get_value() || []; },
			},
			render_input: true,
		});
		budget_ref_ctrl.refresh();
		this._fields.budget_ref = budget_ref_ctrl;

		// Grant ID — MultiSelectList, filtered by partner
		const grant_id_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'grant_id'),
			df: {
				label: 'Grant ID', fieldtype: 'MultiSelectList', fieldname: 'grant_id',
				get_data: (txt) => {
					const partners = (this._fields.partner_id?.get_value() || []);
					const filters = {};
					if (partners.length) filters.partner_id = ['in', partners];
					if (txt) filters.grant_id = ['like', `%${txt}%`];
					return frappe.db.get_list('Creche Budget', { filters, fields: ['grant_id'], limit: 50 })
						.then(rows => [...new Set(rows.map(r => r.grant_id).filter(Boolean))]
							.map(v => ({ value: v, description: '' })));
				},
				change: () => { this._sel.grant_id = grant_id_ctrl.get_value() || []; },
			},
			render_input: true,
		});
		grant_id_ctrl.refresh();
		this._fields.grant_id = grant_id_ctrl;

		// Financial Year — MultiSelectList from Financial year doctype
		const fy_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'financial_year'),
			df: {
				label: 'Financial Year', fieldtype: 'MultiSelectList', fieldname: 'financial_year',
				get_data: (txt) => {
					return frappe.db.get_list('Financial year', {
						fields: ['name'], limit: 50, order_by: 'name desc',
						...(txt ? { filters: { name: ['like', `%${txt}%`] } } : {}),
					}).then(rows => rows.map(r => ({ value: r.name, description: '' })));
				},
				change: () => {
					this._sel.financial_year = fy_ctrl.get_value() || [];
					this._on_filter_change('financial_year');
				},
			},
			render_input: true,
		});
		fy_ctrl.refresh();
		this._fields.financial_year = fy_ctrl;

		// Month — MultiSelectList from Months doctype
		const month_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'month'),
			df: {
				label: 'Month', fieldtype: 'MultiSelectList', fieldname: 'month',
				get_data: (txt) => {
					const ORDER = ['January','February','March','April','May','June',
						'July','August','September','October','November','December'];
					return frappe.db.get_list('Months', { fields: ['name'], limit: 12 })
						.then(rows => rows
							.filter(r => !txt || r.name.toLowerCase().includes(txt.toLowerCase()))
							.sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
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

		// ── ROW 2 ─────────────────────────────────────────────────
		// Start Date
		const start_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'start_date'),
			df: {
				label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date',
				change: () => {
					this._sel.start_date = start_ctrl.get_value() || '';
					this._on_filter_change('start_date');
				},
			},
			render_input: true,
		});
		start_ctrl.refresh();
		this._fields.start_date = start_ctrl;

		// End Date
		const end_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'end_date'),
			df: {
				label: 'End Date', fieldtype: 'Date', fieldname: 'end_date',
				change: () => {
					this._sel.end_date = end_ctrl.get_value() || '';
					this._on_filter_change('end_date');
				},
			},
			render_input: true,
		});
		end_ctrl.refresh();
		this._fields.end_date = end_ctrl;

		// State — MultiSelectList from Creche Budget
		const state_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'state'),
			df: {
				label: 'State', fieldtype: 'MultiSelectList', fieldname: 'state',
				get_data: (txt) => {
					const partners = (this._fields.partner_id?.get_value() || []);
					const filters = {};
					if (partners.length) filters.partner_id = ['in', partners];
					if (txt) filters.state = ['like', `%${txt}%`];
					return frappe.db.get_list('Creche Budget', { filters, fields: ['state'], limit: 100 })
						.then(rows => [...new Set(rows.map(r => r.state).filter(Boolean))].sort()
							.map(v => ({ value: v, description: '' })));
				},
				change: () => { this._sel.state = state_ctrl.get_value() || []; },
			},
			render_input: true,
		});
		state_ctrl.refresh();
		this._fields.state = state_ctrl;

		// District — MultiSelectList from Creche Budget
		const district_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'district'),
			df: {
				label: 'District', fieldtype: 'MultiSelectList', fieldname: 'district',
				get_data: (txt) => {
					const partners = (this._fields.partner_id?.get_value() || []);
					const filters = {};
					if (partners.length) filters.partner_id = ['in', partners];
					if (txt) filters.district = ['like', `%${txt}%`];
					return frappe.db.get_list('Creche Budget', { filters, fields: ['district'], limit: 100 })
						.then(rows => [...new Set(rows.map(r => r.district).filter(Boolean))].sort()
							.map(v => ({ value: v, description: '' })));
				},
				change: () => { this._sel.district = district_ctrl.get_value() || []; },
			},
			render_input: true,
		});
		district_ctrl.refresh();
		this._fields.district = district_ctrl;

		// Block — MultiSelectList from Creche Budget
		const block_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'block'),
			df: {
				label: 'Block', fieldtype: 'MultiSelectList', fieldname: 'block',
				get_data: (txt) => {
					const partners = (this._fields.partner_id?.get_value() || []);
					const filters = {};
					if (partners.length) filters.partner_id = ['in', partners];
					if (txt) filters.block = ['like', `%${txt}%`];
					return frappe.db.get_list('Creche Budget', { filters, fields: ['block'], limit: 100 })
						.then(rows => [...new Set(rows.map(r => r.block).filter(Boolean))].sort()
							.map(v => ({ value: v, description: '' })));
				},
				change: () => { this._sel.block = block_ctrl.get_value() || []; },
			},
			render_input: true,
		});
		block_ctrl.refresh();
		this._fields.block = block_ctrl;

	}


	_ensure_panels() {
		if (document.getElementById('cbd_overlay')) return;
		const overlay = document.createElement('div');
		overlay.className = 'cbd-overlay';
		overlay.id = 'cbd_overlay';
		const left = document.createElement('div');
		left.className = 'cbd-panel-left';
		left.id = 'cbd_panel_left';
		const right = document.createElement('div');
		right.className = 'cbd-panel-right';
		right.id = 'cbd_panel_right';
		// Centre close button — visible only when both panels are open
		const centre = document.createElement('button');
		centre.id = 'cbd_centre_close';
		centre.className = 'cbd-centre-close';
		centre.title = 'Close both panels';
		centre.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
			<span>Close both</span>`;
		document.body.appendChild(overlay);
		document.body.appendChild(left);
		document.body.appendChild(right);
		document.body.appendChild(centre);
		overlay.addEventListener('click', () => this._close_panels());
		centre.addEventListener('click', () => this._close_panels());

		// Global delegated handler for all expand-all checkboxes in any panel
		[left, right].forEach(panel => {
			panel.addEventListener('change', e => {
				const chk = e.target.closest('.cbd-expand-all');
				if (!chk) return;
				const expand = chk.checked;
				// Find the .cbd-panel__body sibling
				const body = panel.querySelector('.cbd-panel__body');
				if (!body) return;
				body.querySelectorAll('.cbd-item-group__body').forEach(b => {
					b.classList.toggle('cbd-item-group__body--collapsed', !expand);
				});
				body.querySelectorAll('.cbd-igh-chevron').forEach(chv => {
					chv.style.transform = expand ? '' : 'rotate(-90deg)';
				});
			});
		});
	}

	// ─────────────────────────────────────────────
	// FILTER HELPERS
	// ─────────────────────────────────────────────

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
			const arr = this._get_val(k);
			if (arr.length) v[k] = arr;
		});
		['start_date','end_date'].forEach(k => {
			const f = this._fields && this._fields[k];
			const val = f ? f.get_value() : '';
			if (val) v[k] = val;
		});
		return v;
	}

	_on_filter_change(key) {
		const has_date = !!(this._fields.start_date?.get_value() || this._fields.end_date?.get_value());
		const has_mfy  = !!(this._get_val('month').length || this._get_val('financial_year').length);

		if ((key === 'start_date' || key === 'end_date') && has_date) {
			['month','financial_year'].forEach(k => {
				this._fields[k]?.set_value([]);
				const col = document.getElementById('cbd_fcol_' + k);
				if (col) col.style.display = 'none';
			});
		} else if ((key === 'month' || key === 'financial_year') && has_mfy) {
			['start_date','end_date'].forEach(k => {
				this._fields[k]?.set_value('');
				const col = document.getElementById('cbd_fcol_' + k);
				if (col) col.style.display = 'none';
			});
		} else if (!has_date && !has_mfy) {
			['month','financial_year','start_date','end_date'].forEach(k => {
				const col = document.getElementById('cbd_fcol_' + k);
				if (col) col.style.display = '';
			});
		}
	}

	_clear_filters() {
		Object.entries(this._fields || {}).forEach(([k, f]) => {
			try {
				f.set_value(f.df.fieldtype === 'Date' ? '' : []);
			} catch(e) {}
		});
		['month','financial_year','start_date','end_date'].forEach(k => {
			const col = document.getElementById('cbd_fcol_' + k);
			if (col) col.style.display = '';
		});
		this.load_data({});
	}

	// ─────────────────────────────────────────────
	// DATA
	// ─────────────────────────────────────────────

	load_data(filters) {
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
			freeze: true,
			freeze_message: 'Loading budget summary…',
			args: { filters: filters || {} },
			callback: (r) => {
				if (!r.message) return;
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
			{
				label:  'Total Budget',
				value:  this._fmt(s.total_budget),
				sub:    'Approved budget',
				accent: 'blue',
				panel:  'budget',
				drill:  'View budget items →',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
			},
			{
				label:  'Total Utilisation',
				value:  this._fmt(s.total_utilisation),
				sub:    'Reported utilisation',
				accent: 'green',
				panel:  'utilisation',
				drill:  'View utilisation →',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#639922" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
			},
			{
				label:  'Bank & Cash Balance',
				value:  this._fmt(s.total_bank_balance),
				sub:    'End of period',
				accent: 'purple',
				panel:  'both',
				drill:  'View line items →',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>`,
			},
			{
				label:  'Interest from Bank',
				value:  this._fmt(s.total_interest),
				sub:    'Earned interest',
				accent: 'amber',
				panel:  'both',
				drill:  'View line items →',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
			},
		];

		el.innerHTML = cards.map(c => `
			<div class="cbd-scard cbd-scard--${c.accent}"
				data-panel="${c.panel}"
				style="cursor:pointer"
				title="${c.drill}">
				<div class="cbd-scard__top">
					<span class="cbd-scard__label">${c.label}</span>
					<span class="cbd-scard__svg">${c.icon}</span>
				</div>
				<div class="cbd-scard__value">${c.value}</div>
				<div class="cbd-scard__sub">
					${c.sub}
					<span class="cbd-scard__drill">${c.drill}</span>
				</div>
			</div>
		`).join('');

		// Per-card click — open only the relevant panel(s)
		el.querySelectorAll('.cbd-scard').forEach(card => {
			card.addEventListener('click', () => {
				const panel = card.dataset.panel;
				this._open_overall_panels(panel);
			});
		});
	}

	// panel: "budget" | "utilisation" | "both"
	_open_overall_panels(panel = 'both') {
		if (!this._all_partners || !this._all_partners.length) {
			frappe.msgprint('No data loaded yet.');
			return;
		}
		const all_budget_ids = this._all_partners
			.flatMap(p => (p.budgets || []).map(b => b.budget_id)).filter(Boolean);
		const all_starts = this._all_partners
			.flatMap(p => (p.budgets || []).map(b => b.grant_start)).filter(Boolean).sort();
		const all_ends = this._all_partners
			.flatMap(p => (p.budgets || []).map(b => b.grant_end)).filter(Boolean).sort().reverse();

		if (!all_budget_ids.length) { frappe.msgprint('No budgets found.'); return; }

		// Title suffix per panel type
		const titles = {
			budget:      'Overall — Budget Line Items',
			utilisation: 'Overall — Utilisation Line Items',
			both:        'Overall Summary',
		};

		this._open_consolidated_panels_typed(
			all_budget_ids,
			titles[panel] || 'Overall Summary',
			all_starts[0] || '',
			all_ends[0]   || '',
			panel
		);
	}

	// Like _open_consolidated_panels but can show only left, right, or both
	_open_consolidated_panels_typed(budget_ids, title, grant_start, grant_end, panel) {
		const overlay = document.getElementById('cbd_overlay');
		const left    = document.getElementById('cbd_panel_left');
		const right   = document.getElementById('cbd_panel_right');

		overlay.classList.add('cbd-overlay--active');
		document.body.classList.add('cbd-panels-open');
		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu');
		if (sidebar) { sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || ''; sidebar.style.zIndex = '1'; }

		const badge = `<span class="cbd-panel__consolidated-badge">Overall</span>`;
		const sub   = `${budget_ids.length} budget${budget_ids.length > 1 ? 's' : ''} · All Partners`;

		const left_html = `
			<div class="cbd-panel__header">
				<div>
					<div class="cbd-panel__title">${badge} Budget Line Items</div>
					<div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div>
				</div>
				<div class="cbd-panel__header-actions">
					
					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
						Expand all
					</label>
					<button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button>
				</div>
			</div>
			<div class="cbd-panel__body" id="cbd_left_body">
				<div class="cbd-panel-loading">Loading…</div>
			</div>
			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none">
				<span>Grand Total</span><span id="cbd_left_total_val">—</span>
			</div>`;

		const right_html = `
			<div class="cbd-panel__header">
				<div>
					<div class="cbd-panel__title">${badge} Utilisation Line Items</div>
					<div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div>
				</div>
				<div class="cbd-panel__header-actions">
					
					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
						Expand all
					</label>
					<button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button>
				</div>
			</div>
			<div class="cbd-panel__filter" id="cbd_month_filter_wrap">
				<div class="cbd-filter-row">
					<div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div>
					<div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div>
				</div>
			</div>
			<div class="cbd-panel__body" id="cbd_right_body">
				<div class="cbd-panel-loading">Loading…</div>
			</div>
			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none">
				<span id="cbd_right_total_lbl">Total</span>
				<span id="cbd_right_total_val">—</span>
			</div>`;

		if (panel === 'budget') {
			left.classList.add('cbd-panel--open', 'cbd-panel--full');
			right.classList.remove('cbd-panel--open');
			left.innerHTML = left_html;
		} else if (panel === 'utilisation') {
			right.classList.add('cbd-panel--open', 'cbd-panel--full');
			left.classList.remove('cbd-panel--open');
			right.innerHTML = right_html;
		} else {
			left.classList.add('cbd-panel--open');
			right.classList.add('cbd-panel--open');
			left.innerHTML  = left_html;
			right.innerHTML = right_html;
			// Show centre close only when both panels are open
			const _cc = document.getElementById('cbd_centre_close');
			if (_cc) _cc.classList.add('cbd-centre-close--visible');
		}

		// Wire close buttons
		const wire = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', fn); };
		wire('cbd_close_panels',    () => this._close_left());
		wire('cbd_close_panels2',   () => this._close_right());


		// Load data into whichever panels are open
		if (panel === 'budget' || panel === 'both') {
			this._load_consolidated_budget_items(budget_ids);
		}
		if (panel === 'utilisation' || panel === 'both') {
			this._load_consolidated_utilisation_items(budget_ids, grant_start, grant_end);
		}
	}

	// ─────────────────────────────────────────────
	// OVERVIEW STRIP
	// ─────────────────────────────────────────────

	_render_overview_strip(partners) {
		const el = document.getElementById('cbd_overview_strip');
		if (!el) return;
		if (!partners.length) { el.style.display = 'none'; return; }

		const num_partners  = partners.length;
		const num_budgets   = partners.reduce((s, p) => s + (p.budgets || []).length, 0);
		const all_states    = [...new Set(partners.flatMap(p => (p.budgets || []).map(b => b.state).filter(Boolean)))];
		const all_districts = [...new Set(partners.flatMap(p =>
			(p.budgets || []).flatMap(b => b.district ? [b.district] : [])))];
		const all_blocks    = [...new Set(partners.flatMap(p =>
			(p.budgets || []).flatMap(b => b.block ? [b.block] : [])))];

		const stats = [
			{
				value: num_partners,
				label: 'Partner' + (num_partners !== 1 ? 's' : ''),
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
			},
			{
				value: num_budgets,
				label: 'Allocated Budget' + (num_budgets !== 1 ? 's' : ''),
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
			},
			{
				value: all_states.length,
				label: 'Working State' + (all_states.length !== 1 ? 's' : ''),
				tip:   all_states.join(', ') || '—',
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
			},
			{
				value: all_districts.length,
				label: 'District' + (all_districts.length !== 1 ? 's' : ''),
				tip:   all_districts.join(', ') || '—',
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
			},
			{
				value: all_blocks.length,
				label: 'Block' + (all_blocks.length !== 1 ? 's' : ''),
				tip:   all_blocks.join(', ') || '—',
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
			},
		];

		el.style.display = '';
		el.innerHTML = stats.map(s => `
			<div class="cbd-ostat" ${s.tip ? `title="${frappe.utils.escape_html(s.tip)}"` : ''}>
				<span class="cbd-ostat__icon">${s.icon}</span>
				<div class="cbd-ostat__body">
					<div class="cbd-ostat__value">${s.value}</div>
					<div class="cbd-ostat__label">${s.label}</div>
				</div>
			</div>
		`).join('');
	}

	// ─────────────────────────────────────────────
	// PARTNER ACCORDIONS
	// ─────────────────────────────────────────────

	render_partners(partners) {
		this._all_partners = partners || [];  // cache for _open_overall_panels
		this._render_overview_strip(partners || []);
		const el = document.getElementById('cbd_partners');
		if (!partners || !partners.length) {
			el.innerHTML = '<div class="cbd-empty">No partner data available.</div>';
			return;
		}
		el.innerHTML = '';

		partners.forEach((partner, idx) => {
			const u_pct     = parseFloat(partner.utilised_pct) || 0;
			const badge_cls = this._badge_cls(u_pct);
			const fill_cls  = this._fill_cls(u_pct);

			const total_creches = (partner.budgets || []).reduce((s, b) => s + (parseInt(b.no_of_creches) || 0), 0);
			const states = [...new Set((partner.budgets || []).map(b => b.state).filter(Boolean))].sort();
			const refs   = [...new Set((partner.budgets || []).map(b => b.budget_reference_name).filter(Boolean))].sort();

			const state_tags = states.length
				? states.map(s => `<span class="cbd-stag cbd-stag--blue"><span class="cbd-stag__dot cbd-stag__dot--blue"></span>${frappe.utils.escape_html(s)}</span>`).join('')
				: '<span class="cbd-stag cbd-stag--gray">—</span>';

			const ref_tags = refs.length
				? refs.map(r => `<span class="cbd-stag cbd-stag--purple"><span class="cbd-stag__dot cbd-stag__dot--purple"></span>${frappe.utils.escape_html(r)}</span>`).join('')
				: '<span class="cbd-stag cbd-stag--gray">—</span>';

			const card = document.createElement('div');
			card.className = 'cbd-partner';
			card.innerHTML = `
				<div class="cbd-partner__head" id="cbd_ph_${idx}">
					<div class="cbd-partner__left">
						<div class="cbd-partner__name">
							${this._icon_partner()}
							${frappe.utils.escape_html(partner.partner_name || '—')}
						</div>
						<div class="cbd-partner__grants">Grants: ${frappe.utils.escape_html(partner.grant_ids || '—')}</div>
						<div class="cbd-partner__metrics">
							${this._metric('Budget',        this._fmt(partner.total_budget))}
							${this._metric('Disbursed',     this._fmt(partner.total_disbursement))}
							${this._metric('Utilised',      this._fmt(partner.total_utilisation))}
							${this._metric('Bal. Budget',   this._fmt(partner.total_balance_budget))}
							${this._metric('Bank Bal.',     this._fmt(partner.total_bank_balance))}
							${this._metric('Interest',      this._fmt(partner.total_interest))}
							${this._metric('Total Creches', total_creches)}
						</div>
						<div class="cbd-partner__footer">
							<div class="cbd-footer-block">
								<div class="cbd-footer-block__label">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
									Operating States
								</div>
								<div class="cbd-footer-block__tags">${state_tags}</div>
							</div>
							<div class="cbd-footer-block">
								<div class="cbd-footer-block__label">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
									Budget References
								</div>
								<div class="cbd-footer-block__tags">${ref_tags}</div>
							</div>
						</div>
						<div class="cbd-prog" style="margin-top:7px">
							<div class="cbd-prog__fill cbd-prog__fill--${fill_cls}" style="width:${Math.min(u_pct,100)}%"></div>
						</div>
					</div>
					<div class="cbd-partner__right">
						<div class="cbd-badge cbd-badge--${badge_cls}">${u_pct.toFixed(1)}% utilised</div>
						<button class="cbd-consolidated-btn"
							data-partner-name="${frappe.utils.escape_html(partner.partner_name || '')}"
							data-budget-ids="${frappe.utils.escape_html((partner.budgets || []).map(b => b.budget_id).join(','))}"
							data-grant-start="${frappe.utils.escape_html((partner.budgets || []).map(b => b.grant_start).filter(Boolean).sort()[0] || '')}"
							data-grant-end="${frappe.utils.escape_html((partner.budgets || []).map(b => b.grant_end).filter(Boolean).sort().reverse()[0] || '')}">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
							Consolidated
						</button>
						<div class="cbd-chevron" id="cbd_chv_${idx}">&#9654;</div>
					</div>
				</div>
				<div class="cbd-partner__body" id="cbd_pb_${idx}">
					${this._build_table(partner.budgets || [], partner.partner_name || '')}
				</div>
			`;
			el.appendChild(card);

			card.querySelector(`#cbd_ph_${idx}`).addEventListener('click', (e) => {
				if (e.target.closest('.cbd-consolidated-btn')) return;
				const body = document.getElementById(`cbd_pb_${idx}`);
				const chv  = document.getElementById(`cbd_chv_${idx}`);
				const open = body.style.display === 'block';
				body.style.display = open ? 'none' : 'block';
				chv.classList.toggle('cbd-chevron--open', !open);
			});
		});
	}

	// ─────────────────────────────────────────────
	// DETAIL TABLE  (with View Line Items button)
	// ─────────────────────────────────────────────

	_build_table(budgets, partner_name) {
		if (!budgets.length) return '<div class="cbd-empty">No budget rows.</div>';

		const rows = budgets.map(r => {
			const u_pct  = parseFloat(r.utilised_pct)             || 0;
			const ud_pct = parseFloat(r.utilised_disbursement_pct) || 0;
			return `
				<tr>
					<td>
						<span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(r.budget_reference_name || '—')}</span>
					</td>
					<td><span class="cbd-chip cbd-chip--teal">${frappe.utils.escape_html(r.grant_id || '—')}</span></td>
					<td>${frappe.utils.escape_html(r.financial_year || '—')}</td>
					<td>${frappe.utils.escape_html(r.state || '—')}</td>
					<td>${this._date(r.grant_start)}</td>
					<td>${this._date(r.grant_end)}</td>
					<td class="cbd-r">${r.no_of_creches || 0}</td>
					<td class="cbd-r">${this._fmt(r.budget)}</td>
					<td class="cbd-r">${this._fmt(r.disbursement)}</td>
					<td class="cbd-r">${this._fmt(r.utilisation)}</td>
					<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(u_pct)}">${u_pct.toFixed(1)}%</span></td>
					<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(ud_pct)}">${ud_pct.toFixed(1)}%</span></td>
					<td class="cbd-r">${this._fmt(r.balance_budget_amount)}</td>
					<td class="cbd-r">${this._fmt(r.bank_balance)}</td>
					<td class="cbd-r">${this._fmt(r.interest_from_bank)}</td>
					<td>
						<button class="cbd-view-btn"
							data-budget-id="${frappe.utils.escape_html(r.budget_id)}"
							data-ref-name="${frappe.utils.escape_html(r.budget_reference_name || '')}"
							data-grant-start="${frappe.utils.escape_html(r.grant_start || '')}"
							data-grant-end="${frappe.utils.escape_html(r.grant_end || '')}">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							Line Items
						</button>
					</td>
				</tr>
			`;
		}).join('');

		return `
			<div class="cbd-tbl-wrap">
				<table class="cbd-table" role="table" aria-label="Budget rows for ${frappe.utils.escape_html(partner_name)}">
					<thead>
						<tr>
							<th>Reference</th>
							<th>Grant ID</th>
							<th>FY</th>
							<th>State</th>
							<th>Start</th>
							<th>End</th>
							<th class="cbd-r">Creches</th>
							<th class="cbd-r">Budget</th>
							<th class="cbd-r">Disbursed</th>
							<th class="cbd-r">Utilised</th>
							<th class="cbd-r">Util %</th>
							<th class="cbd-r">Util vs Disb.</th>
							<th class="cbd-r">Bal. Budget</th>
							<th class="cbd-r">Bank Bal.</th>
							<th class="cbd-r">Interest</th>
							<th></th>
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		`;
	}

	// ─────────────────────────────────────────────
	// SIDE PANELS
	// ─────────────────────────────────────────────

	_open_panels(budget_id, ref_name, grant_start, grant_end) {
		const overlay = document.getElementById('cbd_overlay');
		const left    = document.getElementById('cbd_panel_left');
		const right   = document.getElementById('cbd_panel_right');

		overlay.classList.add('cbd-overlay--active');
		left.classList.add('cbd-panel--open');
		right.classList.add('cbd-panel--open');
		document.body.classList.add('cbd-panels-open');
		const cclose = document.getElementById('cbd_centre_close');
		if (cclose) cclose.classList.add('cbd-centre-close--visible');

		// Push Frappe sidebar behind the overlay
		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
		if (sidebar) {
			sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || '';
			sidebar.style.zIndex = '1';
			sidebar.style.transition = 'z-index 0s';
		}

		// Left panel: Budget line items skeleton
		left.innerHTML = `
			<div class="cbd-panel__header">
				<div>
					<div class="cbd-panel__title">Budget Line Items</div>
					<div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div>
				</div>
				<div class="cbd-panel__header-actions">
					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
						<input type="checkbox" id="cbd_left_expand_all" class="cbd-expand-chk">
						Expand all
					</label>
					<button class="cbd-panel__close" id="cbd_close_panels" title="Close this panel">&#10005;</button>
				</div>
			</div>
			<div class="cbd-panel__body" id="cbd_left_body">
				<div class="cbd-panel-loading">Loading…</div>
			</div>
			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none">
				<span>Grand Total</span><span id="cbd_left_total_val">—</span>
			</div>
		`;

		// Right panel: Utilisation line items skeleton
		right.innerHTML = `
			<div class="cbd-panel__header">
				<div>
					<div class="cbd-panel__title">Utilisation Line Items</div>
					<div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div>
				</div>
				<div class="cbd-panel__header-actions">
					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
						<input type="checkbox" id="cbd_right_expand_all" class="cbd-expand-chk">
						Expand all
					</label>
					<button class="cbd-panel__close" id="cbd_close_panels2" title="Close this panel">&#10005;</button>
				</div>
			</div>
			<div class="cbd-panel__filter" id="cbd_month_filter_wrap">
				<div class="cbd-filter-row">
					<div class="cbd-filter-col">
						<div class="cbd-filter-label">Financial Year</div>
						<div id="cbd_fy_multiselect"></div>
					</div>
					<div class="cbd-filter-col">
						<div class="cbd-filter-label">Month</div>
						<div id="cbd_month_multiselect"></div>
					</div>
				</div>
			</div>
			<div class="cbd-panel__body" id="cbd_right_body">
				<div class="cbd-panel-loading">Loading…</div>
			</div>
			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none">
				<span id="cbd_right_total_lbl">Total</span>
				<span id="cbd_right_total_val">—</span>
			</div>
		`;

		document.getElementById('cbd_close_panels').addEventListener('click',  () => this._close_left());
		document.getElementById('cbd_close_panels2').addEventListener('click', () => this._close_right());


		this._load_budget_items(budget_id);
		this._load_utilisation_items(budget_id, grant_start, grant_end);
	}

	_close_panels() {
		document.getElementById('cbd_overlay').classList.remove('cbd-overlay--active');
		document.getElementById('cbd_panel_left').classList.remove('cbd-panel--open', 'cbd-panel--full');
		document.getElementById('cbd_panel_right').classList.remove('cbd-panel--open', 'cbd-panel--full');
		document.body.classList.remove('cbd-panels-open');
		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
		if (sidebar) sidebar.style.zIndex = sidebar.dataset.cbdPrevZ || '';
		const cc = document.getElementById('cbd_centre_close');
		if (cc) cc.classList.remove('cbd-centre-close--visible');
	}

	_close_left() {
		const left  = document.getElementById('cbd_panel_left');
		const right = document.getElementById('cbd_panel_right');
		left.classList.remove('cbd-panel--open', 'cbd-panel--full');
		const cc = document.getElementById('cbd_centre_close');
		if (cc) cc.classList.remove('cbd-centre-close--visible');
		if (!right.classList.contains('cbd-panel--open')) this._close_panels();
	}

	_close_right() {
		const left  = document.getElementById('cbd_panel_left');
		const right = document.getElementById('cbd_panel_right');
		right.classList.remove('cbd-panel--open', 'cbd-panel--full');
		const cc = document.getElementById('cbd_centre_close');
		if (cc) cc.classList.remove('cbd-centre-close--visible');
		if (!left.classList.contains('cbd-panel--open')) this._close_panels();
	}

	// ─────────────────────────────────────────────
	// LEFT PANEL  — Budget Items (collapsible groups)
	// ─────────────────────────────────────────────

	_load_budget_items(budget_id) {
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
			args: { budget_id },
			callback: (r) => {
				const el = document.getElementById('cbd_left_body');
				if (!el) return;
				const items = (r.message || []);
				if (!items.length) {
					el.innerHTML = '<div class="cbd-panel-empty">No budget line items found.</div>';
					return;
				}

				// Group by budget_main_head
				const groups = {};
				items.forEach(item => {
					const head = item.budget_main_head || 'Other';
					if (!groups[head]) groups[head] = [];
					groups[head].push(item);
				});

				el.innerHTML = '';

				Object.entries(groups).forEach(([head, rows], gidx) => {
					const group_total = rows.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
					const gid = 'lgrp_' + gidx;

					const grp = document.createElement('div');
					grp.className = 'cbd-item-group';
					grp.innerHTML = `
						<div class="cbd-item-group__head cbd-item-group__head--toggle" data-target="${gid}">
							<div class="cbd-igh-left">
								<span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span>
								<span>${frappe.utils.escape_html(head)}</span>
							</div>
							<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
						</div>
						<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
							<table class="cbd-li-table">
								<thead>
									<tr>
										<th>Expense Type</th>
										<th>Sub Head</th>
										<th class="cbd-li-r">Amount</th>
										<th class="cbd-li-r">Y1</th>
										<th class="cbd-li-r">Y2</th>
										<th class="cbd-li-r">Y3</th>
									</tr>
								</thead>
								<tbody>
									${rows.map(row => `
										<tr>
											<td>
												<div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses || '—')}</div>
												${row.notes ? `<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>` : ''}
											</td>
											<td>${frappe.utils.escape_html(row.budget_sub_head || '—')}</td>
											<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
											<td class="cbd-li-r">${row.year_1 ? this._fmt(row.year_1) : '—'}</td>
											<td class="cbd-li-r">${row.year_2 ? this._fmt(row.year_2) : '—'}</td>
											<td class="cbd-li-r">${row.year_3 ? this._fmt(row.year_3) : '—'}</td>
										</tr>
									`).join('')}
								</tbody>
							</table>
						</div>
					`;
					el.appendChild(grp);

					grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
						const body = document.getElementById(gid);
						const chv  = grp.querySelector('.cbd-igh-chevron');
						const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
						chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
					});
				});

				// Sticky total
				const grand = items.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
				const tot = document.getElementById('cbd_left_total');
				const tot_val = document.getElementById('cbd_left_total_val');
				if (tot) { tot.style.display = 'flex'; tot_val.textContent = this._fmt(grand); }


			}
		});
	}

	// ─────────────────────────────────────────────
	// RIGHT PANEL  — Utilisation Items + FY & Month multiselects
	// ─────────────────────────────────────────────

	_load_utilisation_items(budget_id, grant_start, grant_end) {
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
			args: { budget_id },
			callback: (r) => {
				const data       = r.message || {};
				const records    = data.records  || [];
				const all_months = data.months   || [];

				// All 12 calendar months always shown as options
				const ALL_12 = [
					'January','February','March','April','May','June',
					'July','August','September','October','November','December'
				];

				// Derive financial years from grant dates
				const fy_options = this._derive_fy_options(grant_start, grant_end);
				// All FYs that have actual records
				const record_fys = [...new Set(records.map(r => r.financial_year).filter(Boolean))];

				this._util_records    = records;
				this._selected_months = new Set(ALL_12);
				this._selected_fys    = new Set(fy_options.map(f => f.value));

				const fy_wrap    = document.getElementById('cbd_fy_multiselect');
				const month_wrap = document.getElementById('cbd_month_multiselect');
				if (!fy_wrap || !month_wrap) return;

				// ── Financial Year multiselect ─────────────
				this._fy_field = frappe.ui.form.make_control({
					df: {
						fieldtype: 'MultiSelectList',
						fieldname: 'fy_filter',
						label:     'Financial Year',
						get_data: () => fy_options,
					},
					parent: $(fy_wrap),
					render_input: true,
				});
				this._fy_field.refresh();
				this._fy_field.set_value(fy_options.map(f => f.value));
				this._fy_field.df.onchange = () => {
					const val = this._fy_field.get_value() || [];
					this._selected_fys = new Set(Array.isArray(val) ? val : [val]);
					this._render_utilisation();
				};

				// ── Month multiselect (always all 12) ──────
				this._month_field = frappe.ui.form.make_control({
					df: {
						fieldtype: 'MultiSelectList',
						fieldname: 'month_filter',
						label:     'Month',
						get_data: () => ALL_12.map(m => ({ value: m, description: '' })),
					},
					parent: $(month_wrap),
					render_input: true,
				});
				this._month_field.refresh();
				this._month_field.set_value(ALL_12);
				this._month_field.df.onchange = () => {
					const val = this._month_field.get_value() || [];
					this._selected_months = new Set(Array.isArray(val) ? val : [val]);
					this._render_utilisation();
				};

				// Default: show everything
				if (!records.length) {
					document.getElementById('cbd_right_body').innerHTML = '<div class="cbd-panel-empty">No utilisation records found for this budget.</div>';
					return;
				}
				this._render_utilisation();
			}
		});
	}

	// Derive financial year options from grant start → end dates
	// e.g. 2022-04-01 to 2024-03-31 → ["2022-23", "2023-24"]
	_derive_fy_options(start_str, end_str) {
		const ALL_12 = [
			'January','February','March','April','May','June',
			'July','August','September','October','November','December'
		];
		const to_fy = (date_str) => {
			if (!date_str) return null;
			const d    = new Date(date_str);
			const yr   = d.getFullYear();
			const mo   = d.getMonth() + 1; // 1-based
			const fy_start = mo >= 4 ? yr : yr - 1;
			return `${fy_start}-${String(fy_start + 1).slice(-2)}`;
		};

		const start_fy = to_fy(start_str);
		const end_fy   = to_fy(end_str);

		if (!start_fy) return [];

		const options = [];
		let [sy] = start_fy.split('-').map(Number);
		const [ey] = (end_fy || start_fy).split('-').map(Number);

		while (sy <= ey) {
			const label = `${sy}-${String(sy + 1).slice(-2)}`;
			options.push({ value: label, description: '' });
			sy++;
		}
		return options;
	}

	_render_utilisation() {
		const el = document.getElementById('cbd_right_body');
		if (!el) return;

		const MONTH_ORDER = [
			'January','February','March','April','May','June',
			'July','August','September','October','November','December'
		];

		const sel_months = this._selected_months || new Set();
		const sel_fys    = this._selected_fys    || new Set();

		const records = (this._util_records || []).filter(r => {
			const month_ok = sel_months.size === 0 || sel_months.has(r.month);
			const fy_ok    = sel_fys.size === 0    || sel_fys.has(r.financial_year);
			return month_ok && fy_ok;
		});

		if (!records.length) {
			el.innerHTML = '<div class="cbd-panel-empty">No data for selected period.</div>';
			const rt = document.getElementById('cbd_right_total');
			if (rt) rt.style.display = 'none';
			return;
		}

		// Sorted months present in filtered records
		const active_months = [...new Set(records.map(r => r.month))]
			.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
		const is_multi = active_months.length > 1;

		// YTD combine: sum total_amount per expense type across all selected records
		// Also keep per-month breakdown for multi-month view
		const combined = {};   // key → { meta, total_amount, by_month:{month→amt} }
		records.forEach(rec => {
			(rec.items || []).forEach(item => {
				const key = item.type_of_expenses_id || item.type_of_expenses || 'unknown';
				if (!combined[key]) {
					combined[key] = {
						type_of_expenses: item.type_of_expenses,
						budget_main_head: item.budget_main_head,
						budget_sub_head:  item.budget_sub_head,
						notes:            item.notes,
						total_amount:     0,
						by_month:         {},
					};
				}
				const amt = parseFloat(item.total_amount) || 0;
				combined[key].total_amount += amt;
				combined[key].by_month[rec.month] = (combined[key].by_month[rec.month] || 0) + amt;
			});
		});

		// Group by main head
		const groups = {};
		Object.values(combined).forEach(item => {
			const head = item.budget_main_head || 'Other';
			if (!groups[head]) groups[head] = [];
			groups[head].push(item);
		});

		el.innerHTML = '';

		// YTD label bar
		if (is_multi) {
			const bar = document.createElement('div');
			bar.className = 'cbd-ytd-bar';
			bar.innerHTML = `
				<span class="cbd-ytd-badge">YTD</span>
				<span class="cbd-ytd-label">
					Combined across <b>${active_months.length}</b> months:
					${active_months.map(m => `<span class="cbd-ytd-month">${frappe.utils.escape_html(m)}</span>`).join('')}
				</span>
			`;
			el.appendChild(bar);
		}

		let grand = 0;

		Object.entries(groups).forEach(([head, rows], gidx) => {
			const group_total = rows.reduce((s, r) => s + r.total_amount, 0);
			grand += group_total;
			const gid = 'rgrp_' + gidx;

			const grp = document.createElement('div');
			grp.className = 'cbd-item-group';

			// Build month header cols (only in multi-month mode)
			const month_ths = is_multi
				? active_months.map(m => `<th class="cbd-li-r cbd-li-month-col">${m.slice(0,3)}</th>`).join('')
				: '';
			const month_tds = (row) => is_multi
				? active_months.map(m => `<td class="cbd-li-r cbd-li-month-col">${row.by_month[m] ? this._fmt(row.by_month[m]) : '—'}</td>`).join('')
				: '';

			grp.innerHTML = `
				<div class="cbd-item-group__head cbd-item-group__head--toggle" data-target="${gid}">
					<div class="cbd-igh-left">
						<span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span>
						<span>${frappe.utils.escape_html(head)}</span>
					</div>
					<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
				</div>
				<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
					<table class="cbd-li-table">
						<thead>
							<tr>
								<th>Expense Type</th>
								<th>Sub Head</th>
								${month_ths}
								<th class="cbd-li-r">${is_multi ? 'YTD Total' : 'Amount'}</th>
							</tr>
						</thead>
						<tbody>
							${rows.map(row => `
								<tr>
									<td>
										<div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses || '—')}</div>
										${row.notes ? `<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>` : ''}
									</td>
									<td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head || '—')}</td>
									${month_tds(row)}
									<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				</div>
			`;
			el.appendChild(grp);

			grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
				const body = document.getElementById(gid);
				const chv  = grp.querySelector('.cbd-igh-chevron');
				const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
				chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
			});
		});

		// Update sticky total
		const rt     = document.getElementById('cbd_right_total');
		const rt_val = document.getElementById('cbd_right_total_val');
		const rt_lbl = document.getElementById('cbd_right_total_lbl');
		if (rt) {
			rt.style.display = 'flex';
			rt_val.textContent = this._fmt(grand);
			if (rt_lbl) rt_lbl.textContent = is_multi ? `YTD Total (${active_months.length} months)` : 'Total';
		}


	}

	// ─────────────────────────────────────────────
	// CONSOLIDATED PANELS  (partner-level)
	// ─────────────────────────────────────────────

	_open_consolidated_panels(budget_ids, partner_name, grant_start, grant_end) {
		const overlay = document.getElementById('cbd_overlay');
		const left    = document.getElementById('cbd_panel_left');
		const right   = document.getElementById('cbd_panel_right');

		overlay.classList.add('cbd-overlay--active');
		left.classList.add('cbd-panel--open');
		right.classList.add('cbd-panel--open');
		document.body.classList.add('cbd-panels-open');
		const _consol_cc = document.getElementById('cbd_centre_close');
		if (_consol_cc) _consol_cc.classList.add('cbd-centre-close--visible');

		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
		if (sidebar) {
			sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || '';
			sidebar.style.zIndex = '1';
		}

		const title_sub = `${budget_ids.length} budget${budget_ids.length > 1 ? 's' : ''} · Consolidated`;

		// Left panel
		left.innerHTML = `
			<div class="cbd-panel__header">
				<div>
					<div class="cbd-panel__title">
						<span class="cbd-panel__consolidated-badge">Consolidated</span>
						Budget Line Items
					</div>
					<div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div>
				</div>
				<div class="cbd-panel__header-actions">
					
					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
						Expand all
					</label>
					<button class="cbd-panel__close" id="cbd_close_panels" title="Close this panel">&#10005;</button>
				</div>
			</div>
			<div class="cbd-panel__body" id="cbd_left_body">
				<div class="cbd-panel-loading">Loading ${budget_ids.length} budgets…</div>
			</div>
			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none">
				<span>Grand Total</span><span id="cbd_left_total_val">—</span>
			</div>
		`;

		// Right panel
		right.innerHTML = `
			<div class="cbd-panel__header">
				<div>
					<div class="cbd-panel__title">
						<span class="cbd-panel__consolidated-badge">Consolidated</span>
						Utilisation Line Items
					</div>
					<div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div>
				</div>
				<div class="cbd-panel__header-actions">
					
					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
						Expand all
					</label>
					<button class="cbd-panel__close" id="cbd_close_panels2" title="Close this panel">&#10005;</button>
				</div>
			</div>
			<div class="cbd-panel__filter" id="cbd_month_filter_wrap">
				<div class="cbd-filter-row">
					<div class="cbd-filter-col">
						<div class="cbd-filter-label">Financial Year</div>
						<div id="cbd_fy_multiselect"></div>
					</div>
					<div class="cbd-filter-col">
						<div class="cbd-filter-label">Month</div>
						<div id="cbd_month_multiselect"></div>
					</div>
				</div>
			</div>
			<div class="cbd-panel__body" id="cbd_right_body">
				<div class="cbd-panel-loading">Loading…</div>
			</div>
			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none">
				<span id="cbd_right_total_lbl">Total</span>
				<span id="cbd_right_total_val">—</span>
			</div>
		`;

		document.getElementById('cbd_close_panels').addEventListener('click',  () => this._close_left());
		document.getElementById('cbd_close_panels2').addEventListener('click', () => this._close_right());


		// Load all budget line items and merge them
		this._load_consolidated_budget_items(budget_ids);
		this._load_consolidated_utilisation_items(budget_ids, grant_start, grant_end);
	}

	// Consolidated budget items — fetch all budget_ids in parallel, merge by expense type
	_load_consolidated_budget_items(budget_ids) {
		const promises = budget_ids.map(bid =>
			frappe.call({
				method: 'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
				args:   { budget_id: bid },
			})
		);

		Promise.all(promises).then(results => {
			const el = document.getElementById('cbd_left_body');
			if (!el) return;

			// Merge all items, sum by type_of_expenses_id
			const merged = {};
			results.forEach(r => {
				(r.message || []).forEach(item => {
					const key = item.type_of_expenses_id || item.type_of_expenses || 'unknown';
					if (!merged[key]) {
						merged[key] = {
							type_of_expenses: item.type_of_expenses,
							budget_main_head: item.budget_main_head,
							budget_sub_head:  item.budget_sub_head,
							notes:            item.notes,
							total_amount:     0,
							year_1: 0, year_2: 0, year_3: 0,
						};
					}
					merged[key].total_amount += parseFloat(item.total_amount) || 0;
					merged[key].year_1       += parseFloat(item.year_1)       || 0;
					merged[key].year_2       += parseFloat(item.year_2)       || 0;
					merged[key].year_3       += parseFloat(item.year_3)       || 0;
				});
			});

			const items = Object.values(merged);
			if (!items.length) {
				el.innerHTML = '<div class="cbd-panel-empty">No budget line items found.</div>';
				return;
			}

			// Group by main head
			const groups = {};
			items.forEach(item => {
				const head = item.budget_main_head || 'Other';
				if (!groups[head]) groups[head] = [];
				groups[head].push(item);
			});

			el.innerHTML = '';
			Object.entries(groups).forEach(([head, rows], gidx) => {
				const group_total = rows.reduce((s, r) => s + r.total_amount, 0);
				const gid = 'clgrp_' + gidx;
				const grp = document.createElement('div');
				grp.className = 'cbd-item-group';
				grp.innerHTML = `
					<div class="cbd-item-group__head cbd-item-group__head--toggle">
						<div class="cbd-igh-left">
							<span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span>
							<span>${frappe.utils.escape_html(head)}</span>
						</div>
						<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
					</div>
					<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
						<table class="cbd-li-table">
							<thead><tr>
								<th>Expense Type</th><th>Sub Head</th>
								<th class="cbd-li-r">Total</th>
								<th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th>
							</tr></thead>
							<tbody>
								${rows.map(row => `
									<tr>
										<td><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>
										${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td>
										<td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td>
										<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
										<td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td>
										<td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td>
										<td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td>
									</tr>
								`).join('')}
							</tbody>
						</table>
					</div>
				`;
				el.appendChild(grp);
				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
					const body = document.getElementById(gid);
					const chv  = grp.querySelector('.cbd-igh-chevron');
					const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
					chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
				});
			});

			const grand = items.reduce((s, r) => s + r.total_amount, 0);
			const tot = document.getElementById('cbd_left_total');
			const tot_val = document.getElementById('cbd_left_total_val');
			if (tot) { tot.style.display = 'flex'; tot_val.textContent = this._fmt(grand); }
		});
	}

	// Consolidated utilisation — fetch all budget_ids, merge records, then use existing filter/render
	_load_consolidated_utilisation_items(budget_ids, grant_start, grant_end) {
		const promises = budget_ids.map(bid =>
			frappe.call({
				method: 'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
				args:   { budget_id: bid },
			})
		);

		Promise.all(promises).then(results => {
			// Merge all records arrays from every budget
			const all_records = [];
			results.forEach(r => {
				((r.message || {}).records || []).forEach(rec => all_records.push(rec));
			});

			const ALL_12 = [
				'January','February','March','April','May','June',
				'July','August','September','October','November','December'
			];

			const fy_options = this._derive_fy_options(grant_start, grant_end);
			this._util_records    = all_records;
			this._selected_months = new Set(ALL_12);
			this._selected_fys    = new Set(fy_options.map(f => f.value));

			const fy_wrap    = document.getElementById('cbd_fy_multiselect');
			const month_wrap = document.getElementById('cbd_month_multiselect');
			if (!fy_wrap || !month_wrap) return;

			// Financial Year multiselect
			this._fy_field = frappe.ui.form.make_control({
				df: { fieldtype:'MultiSelectList', fieldname:'fy_filter', label:'FY',
					get_data: () => fy_options },
				parent: $(fy_wrap), render_input: true,
			});
			this._fy_field.refresh();
			this._fy_field.set_value(fy_options.map(f => f.value));
			this._fy_field.df.onchange = () => {
				const val = this._fy_field.get_value() || [];
				this._selected_fys = new Set(Array.isArray(val) ? val : [val]);
				this._render_utilisation();
			};

			// Month multiselect (all 12)
			this._month_field = frappe.ui.form.make_control({
				df: { fieldtype:'MultiSelectList', fieldname:'month_filter', label:'Month',
					get_data: () => ALL_12.map(m => ({ value: m, description: '' })) },
				parent: $(month_wrap), render_input: true,
			});
			this._month_field.refresh();
			this._month_field.set_value(ALL_12);
			this._month_field.df.onchange = () => {
				const val = this._month_field.get_value() || [];
				this._selected_months = new Set(Array.isArray(val) ? val : [val]);
				this._render_utilisation();
			};

			if (!all_records.length) {
				document.getElementById('cbd_right_body').innerHTML = '<div class="cbd-panel-empty">No utilisation records found.</div>';
				return;
			}
			this._render_utilisation();
		});
	}

	// ─────────────────────────────────────────────
	// HELPERS
	// ─────────────────────────────────────────────

	_fmt(n) {
		if (n === null || n === undefined || n === '') return '—';
		const v = parseFloat(n) || 0;
		if (Math.abs(v) >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
		if (Math.abs(v) >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
		return '₹' + Math.round(v).toLocaleString('en-IN');
	}

	_date(d) {
		if (!d) return '—';
		return frappe.datetime.str_to_user(d) || d;
	}

	_metric(label, value) {
		return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${value}</span></div>`;
	}

	_icon_partner() {
		return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><rect x="3" y="7" width="18" height="14" rx="1"/><path d="M8 21V11h8v10"/><path d="M3 7l9-4 9 4"/></svg>`;
	}

	_fill_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
	_chip_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
	_badge_cls(v) { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }

	// ─────────────────────────────────────────────
	// EVENT DELEGATION for View Line Items
	// ─────────────────────────────────────────────

	_bind_view_buttons() {
		document.getElementById('cbd_partners').addEventListener('click', (e) => {

			// Single budget line items
			const btn = e.target.closest('.cbd-view-btn');
			if (btn) {
				e.stopPropagation();
				this._open_panels(
					btn.dataset.budgetId,
					btn.dataset.refName,
					btn.dataset.grantStart || '',
					btn.dataset.grantEnd   || ''
				);
				return;
			}

			// Partner consolidated
			const cbtn = e.target.closest('.cbd-consolidated-btn');
			if (cbtn) {
				e.stopPropagation();
				const budget_ids  = (cbtn.dataset.budgetIds || '').split(',').filter(Boolean);
				const partner_name = cbtn.dataset.partnerName || 'Partner';
				const grant_start  = cbtn.dataset.grantStart || '';
				const grant_end    = cbtn.dataset.grantEnd   || '';
				this._open_consolidated_panels(budget_ids, partner_name, grant_start, grant_end);
				return;
			}
		});
	}

	// ─────────────────────────────────────────────
	// STYLES
	// ─────────────────────────────────────────────

	_inject_styles() {
		if (document.getElementById('cbd-styles')) return;
		const style = document.createElement('style');
		style.id = 'cbd-styles';
		style.textContent = `

		.cbd-root { padding: 16px 20px 40px; }

		/* ── Filter rows ─────────────────────────── */
		.custom-filter-row {
			padding: 0;
			background: var(--card-bg,#fff);
			border-radius: 6px;
			margin-top: 0;
			margin-left: 0;
			margin-right: 0;
		}
		/* 5 equal cols via flex */
		.custom-filter-row { display: flex; flex-wrap: wrap; }
		.cbd-filter-col {
			flex: 1 1 20%;
			min-width: 0;
			padding: 8px 8px 0;
			box-sizing: border-box;
		}
		.custom-filter-actions {
			padding: 8px 8px 10px !important;
			border-top: 1px solid var(--border-color,#d1d8dd);
			margin-top: 4px;
			width: 100%;
			display: flex;
			justify-content: flex-end;
		}
		.custom-filter-actions .col-md-12 {
			padding: 0;
			width: 100%;
			text-align: right;
		}

		/* ── Custom multiselect ───────────────── */
		.cbd-ms { position: relative; }

		/* Caret icon inside real Frappe input */
		.cbd-ms-caret {
			position: absolute;
			right: 8px;
			top: 50%;
			transform: translateY(-50%);
			font-size: 10px;
			color: var(--text-muted,#8d99a6);
			pointer-events: none;
			z-index: 1;
		}
		/* Pad input so text doesn't overlap caret */
		.cbd-ms-inp { padding-right: 22px !important; cursor: pointer !important; }

		/* Dropdown panel — sits under control-input-wrapper */
		.control-input-wrapper { position: relative; }
		.cbd-ms__drop {
			display: none;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			min-width: 220px;
			background: var(--card-bg,#fff);
			border: 1px solid var(--border-color,#d1d8dd);
			border-radius: 6px;
			box-shadow: 0 8px 24px rgba(0,0,0,.13);
			z-index: 3000;
			overflow: hidden;
		}

		/* Selected tags strip */
		.cbd-ms__tags {
			display: flex;
			flex-wrap: wrap;
			gap: 3px;
			margin-top: 4px;
		}
		.cbd-ms__tag {
			display: inline-flex;
			align-items: center;
			gap: 3px;
			padding: 2px 8px;
			background: #E6F1FB;
			color: #0C447C;
			border: 1px solid #B5D4F4;
			border-radius: 12px;
			font-size: 11px;
			font-weight: 500;
		}
		.cbd-ms__tagx {
			cursor: pointer;
			color: #378ADD;
			font-size: 13px;
			line-height: 1;
			margin-left: 1px;
		}
		.cbd-ms__tagx:hover { color: #A32D2D; }

		/* Search */
		.cbd-ms__search-wrap {
			padding: 8px 10px 6px;
			border-bottom: 1px solid var(--border-color,#d1d8dd);
		}
		.cbd-ms__search {
			width: 100%;
			height: 28px;
			padding: 4px 8px;
			font-size: 12px;
			border: 1px solid var(--border-color,#d1d8dd);
			border-radius: 5px;
			background: var(--control-bg,#f7f7f7);
			outline: none;
			color: var(--text-color,#1c2126);
		}
		.cbd-ms__search:focus { border-color: #378ADD; background: #fff; }

		/* Options list */
		.cbd-ms__list {
			max-height: 200px;
			overflow-y: auto;
		}
		.cbd-ms__list::-webkit-scrollbar { width: 4px; }
		.cbd-ms__list::-webkit-scrollbar-thumb { background: var(--border-color,#d1d8dd); border-radius: 2px; }

		.cbd-ms__opt {
			display: flex;
			align-items: center;
			gap: 9px;
			padding: 8px 12px;
			font-size: 13px;
			color: var(--text-color,#1c2126);
			cursor: pointer;
			border-bottom: 1px solid var(--border-color,#d1d8dd);
		}
		.cbd-ms__opt:last-child { border-bottom: none; }
		.cbd-ms__opt:hover { background: var(--control-bg,#f7f7f7); }
		.cbd-ms__opt--on { background: #f0faf3; }
		.cbd-ms__opt--on:hover { background: #e3f6e9; }

		.cbd-ms__cb {
			width: 16px;
			height: 16px;
			border: 1.5px solid var(--border-color,#d1d8dd);
			border-radius: 4px;
			background: #fff;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			transition: border-color .1s, background .1s;
		}
		.cbd-ms__opt--on .cbd-ms__cb {
			background: #EAF6EF;
			border-color: #2D9C5A;
		}
		.cbd-ms__optlabel { flex: 1; }

		/* Footer */
		.cbd-ms__footer {
			display: flex;
			justify-content: flex-end;
			gap: 6px;
			padding: 7px 10px;
			border-top: 1px solid var(--border-color,#d1d8dd);
			background: var(--control-bg,#f7f7f7);
		}
		.cbd-ms__footer-btn {
			padding: 3px 10px;
			font-size: 11px;
			font-weight: 600;
			border-radius: 5px;
			border: 1px solid var(--border-color,#d1d8dd);
			background: #fff;
			color: #185FA5;
			cursor: pointer;
		}
		.cbd-ms__footer-btn:hover { background: #E6F1FB; border-color: #B5D4F4; }
		.cbd-ms__footer-btn--clear { color: #A32D2D; }
		.cbd-ms__footer-btn--clear:hover { background: #FCEBEB; border-color: #F09595; }

		.cbd-ms__empty {
			padding: 14px;
			text-align: center;
			color: var(--text-muted,#8d99a6);
			font-size: 12px;
		}

		/* ── Filter actions ───────────────────── */
		.cbd-filter-bar__actions {
			display: flex;
			gap: 8px;
			padding-top: 10px;
			border-top: 1px solid var(--border-color,#d1d8dd);
			justify-content: flex-end;
			align-items: center;
			margin-top: 4px;
		}
		.cbd-filter-bar__actions .btn {
			min-width: 80px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
		}

		/* ── Overview strip ────────────────────── */
		.cbd-overview-strip {
			display: flex;
			align-items: stretch;
			gap: 0;
			background: var(--card-bg,#fff);
			border: 1px solid var(--border-color,#d1d8dd);
			border-radius: 10px;
			margin-bottom: 12px;
			overflow: hidden;
		}
		.cbd-ostat {
			display: flex;
			align-items: center;
			gap: 10px;
			flex: 1;
			padding: 14px 18px;
			min-width: 0;
			border-right: 1px solid var(--border-color,#d1d8dd);
			cursor: default;
			transition: background .12s;
		}
		.cbd-ostat:last-child { border-right: none; }
		.cbd-ostat[title] { cursor: help; }
		.cbd-ostat[title]:hover { background: var(--control-bg,#f7f7f7); }
		.cbd-ostat__icon {
			width: 36px;
			height: 36px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 8px;
			background: var(--control-bg,#f0f4f8);
			color: #378ADD;
			flex-shrink: 0;
		}
		.cbd-ostat__body { min-width: 0; }
		.cbd-ostat__value {
			font-size: 20px;
			font-weight: 600;
			color: var(--text-color,#1c2126);
			line-height: 1.1;
		}
		.cbd-ostat__label {
			font-size: 10px;
			font-weight: 500;
			text-transform: uppercase;
			letter-spacing: .6px;
			color: var(--text-muted,#8d99a6);
			margin-top: 2px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		/* ── Summary cards ─────────────────────── */
		.cbd-summary-cards {
			display: grid;
			grid-template-columns: repeat(4,1fr);
			gap: 10px;
			margin-bottom: 14px;
		}
		.cbd-scard {
			background: var(--card-bg,#fff);
			border: 1px solid var(--border-color,#d1d8dd);
			border-radius: 10px;
			padding: 14px 16px;
			border-left: 4px solid transparent;
			transition: box-shadow .15s;
		}
		.cbd-scard:hover { box-shadow: 0 2px 12px rgba(0,0,0,.08); }
		.cbd-scard--blue   { border-left-color:#378ADD; }
		.cbd-scard--green  { border-left-color:#639922; }
		.cbd-scard--purple { border-left-color:#7F77DD; }
		.cbd-scard--amber  { border-left-color:#BA7517; }
		.cbd-scard__top {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}
		.cbd-scard__label {
			font-size: 10px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: .6px;
			color: var(--text-muted,#8d99a6);
		}
		.cbd-scard__icon { font-size: 16px; }
		.cbd-scard__svg { display:flex; align-items:center; flex-shrink:0; }
		.cbd-scard__value {
			font-size: 22px;
			font-weight: 600;
			color: var(--text-color,#1c2126);
			margin-top: 8px;
			line-height: 1;
		}
		.cbd-scard__sub {
			font-size: 11px;
			color: var(--text-muted,#8d99a6);
			margin-top: 4px;
			display: flex;
			align-items: center;
			gap: 8px;
			flex-wrap: wrap;
		}
		.cbd-scard__drill {
			font-size: 10px;
			font-weight: 600;
			color: #378ADD;
			opacity: 0;
			transition: opacity .15s;
		}
		.cbd-scard:hover .cbd-scard__drill { opacity: 1; }
		.cbd-scard:hover { box-shadow: 0 4px 16px rgba(55,138,221,.15); border-color: #B5D4F4; }

		/* ── Progress ───────────────────────────── */
		.cbd-prog { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; margin-top:10px; overflow:hidden; }
		.cbd-prog__fill { height:100%; border-radius:2px; transition:width .5s ease; }
		.cbd-prog__fill--green { background:#639922; }
		.cbd-prog__fill--amber { background:#BA7517; }
		.cbd-prog__fill--red   { background:#E24B4A; }
		.cbd-prog__fill--blue  { background:#378ADD; }

		/* ── Section label ──────────────────────── */
		.cbd-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.9px; color:var(--text-muted,#8d99a6); margin-bottom:10px; margin-top:0; }

		/* ── Partners scroll ────────────────────── */
		#cbd_partners { max-height:calc(100vh - 320px); overflow-y:auto; padding-right:4px; }
		#cbd_partners::-webkit-scrollbar { width:4px; }
		#cbd_partners::-webkit-scrollbar-track { background:transparent; }
		#cbd_partners::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

		/* ── Partner card ───────────────────────── */
		.cbd-partner { background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; margin-bottom:10px; overflow:hidden; }

		.cbd-partner__head { display:flex; align-items:flex-start; justify-content:space-between; padding:10px 14px; cursor:pointer; gap:16px; border-left:3px solid #378ADD; }
		.cbd-partner__head:hover { background:var(--control-bg,#f7f7f7); }
		.cbd-partner__left { flex:1; min-width:0; }

		.cbd-partner__name { font-size:14px; font-weight:600; color:var(--text-color,#1c2126); display:flex; align-items:center; gap:7px; }
		.cbd-partner__grants { font-size:13px; font-weight:500; color:var(--text-muted,#8d99a6); margin-top:4px; padding-left:22px; }

		.cbd-partner__metrics { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
		.cbd-metric { display:flex; flex-direction:column; background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); border-radius:6px; padding:3px 8px; min-width:72px; }
		.cbd-metric__label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); }
		.cbd-metric__value { font-size:12px; font-weight:600; color:var(--text-color,#1c2126); margin-top:1px; }

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

		.cbd-partner__right { display:flex; flex-direction:column; align-items:flex-end; gap:10px; flex-shrink:0; padding-top:2px; }

		.cbd-badge { display:inline-flex; align-items:center; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:600; white-space:nowrap; }
		.cbd-badge--green { background:#EAF3DE; color:#3B6D11; }
		.cbd-badge--amber { background:#FAEEDA; color:#854F0B; }
		.cbd-badge--red   { background:#FCEBEB; color:#A32D2D; }

		.cbd-chevron { font-size:11px; color:var(--text-muted,#8d99a6); transition:transform .2s ease; line-height:1; }
		.cbd-chevron--open { transform:rotate(90deg); }

		/* ── Detail table ───────────────────────── */
		.cbd-partner__body { display:none; border-top:1px solid var(--border-color,#d1d8dd); }
		.cbd-tbl-wrap { overflow-x:auto; }
		.cbd-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 12px;
			white-space: nowrap;
			border: 1px solid var(--border-color,#d1d8dd);
		}
		.cbd-table thead { position:sticky; top:0; z-index:1; }
		.cbd-table th {
			padding: 9px 12px;
			text-align: left;
			font-size: 10px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: .5px;
			color: var(--text-muted,#8d99a6);
			background: var(--control-bg,#f7f7f7);
			border: 1px solid var(--border-color,#d1d8dd);
		}
		.cbd-table td {
			padding: 8px 12px;
			color: var(--text-color,#1c2126);
			border: 1px solid var(--border-color,#d1d8dd);
			vertical-align: middle;
		}
		.cbd-table tbody tr:hover td { background: var(--control-bg,#f7f7f7); }
		.cbd-r { text-align:right !important; }

		.cbd-chip { display:inline-flex; align-items:center; border-radius:4px; padding:2px 7px; font-size:11px; font-weight:600; }
		.cbd-chip--blue   { background:#E6F1FB; color:#185FA5; }
		.cbd-chip--teal   { background:#E1F5EE; color:#0F6E56; }
		.cbd-chip--green  { background:#EAF3DE; color:#3B6D11; }
		.cbd-chip--amber  { background:#FAEEDA; color:#854F0B; }
		.cbd-chip--red    { background:#FCEBEB; color:#A32D2D; }

		/* ── Consolidated button (partner level) ── */
		.cbd-consolidated-btn {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			padding: 4px 10px;
			font-size: 11px;
			font-weight: 600;
			color: #3C3489;
			background: #EEEDFE;
			border: 1px solid #AFA9EC;
			border-radius: 5px;
			cursor: pointer;
			white-space: nowrap;
			transition: background .15s;
		}
		.cbd-consolidated-btn:hover { background: #CECBF6; }

		/* ── Consolidated panel badge ───────────── */
		.cbd-panel__consolidated-badge {
			display: inline-flex;
			align-items: center;
			padding: 1px 7px;
			background: #534AB7;
			color: #fff;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 700;
			letter-spacing: .4px;
			margin-right: 5px;
			vertical-align: middle;
		}

		/* ── View Line Items button ─────────────── */
		.cbd-view-btn {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			padding: 4px 10px;
			font-size: 11px;
			font-weight: 600;
			color: #185FA5;
			background: #E6F1FB;
			border: none;
			border-radius: 5px;
			cursor: pointer;
			white-space: nowrap;
			transition: background .15s;
		}
		.cbd-view-btn:hover { background: #B5D4F4; }

		/* ── Overlay ────────────────────────────── */
		.cbd-overlay {
			display: none;
			position: fixed;
			inset: 0;
			background: rgba(0,0,0,.45);
			z-index: 2000;
		}
		.cbd-overlay--active { display:block; }

		/* ── Side panels ────────────────────────── */
		.cbd-panel-left,
		.cbd-panel-right {
			position: fixed;
			top: 0;
			bottom: 0;
			width: 44vw;
			max-width: 600px;
			min-width: 380px;
			background: var(--card-bg,#fff);
			z-index: 2001;
			display: flex;
			flex-direction: column;
			transition: transform .28s cubic-bezier(.4,0,.2,1);
			overflow: hidden;
		}
		.cbd-panel-left  { left:0;  transform:translateX(-100%); border-right:1px solid var(--border-color,#d1d8dd); }
		.cbd-panel-right { right:0; transform:translateX(100%);  border-left:1px solid var(--border-color,#d1d8dd); }
		.cbd-panel-left.cbd-panel--open  { transform:translateX(0); }
		.cbd-panel-right.cbd-panel--open { transform:translateX(0); }
		/* Full-width single panel (budget or utilisation only) */
		.cbd-panel-left.cbd-panel--full,
		.cbd-panel-right.cbd-panel--full {
			width: 60vw;
			max-width: 860px;
		}

		.cbd-panel__header {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			padding: 16px 18px 14px;
			border-bottom: 1px solid var(--border-color,#d1d8dd);
			flex-shrink: 0;
		}
		.cbd-panel__title { font-size:14px; font-weight:700; color:var(--text-color,#1c2126); }
		.cbd-panel__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:3px; }
		.cbd-panel__close {
			background: none;
			border: none;
			font-size: 16px;
			cursor: pointer;
			color: var(--text-muted,#8d99a6);
			padding: 0 4px;
			line-height: 1;
		}
		.cbd-panel__close:hover { color:var(--text-color,#1c2126); }

		/* ── Month filter ───────────────────────── */
		.cbd-panel__filter {
			padding: 10px 18px;
			border-bottom: 1px solid var(--border-color,#d1d8dd);
			flex-shrink: 0;
		}
		.cbd-filter-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); margin-bottom:7px; }


		/* ── Panel body ─────────────────────────── */
		.cbd-panel__body {
			flex: 1;
			overflow-y: auto;
			padding: 14px 18px;
		}
		.cbd-panel__body::-webkit-scrollbar { width:4px; }
		.cbd-panel__body::-webkit-scrollbar-track { background:transparent; }
		.cbd-panel__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

		.cbd-panel-loading { text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; padding:30px 0; }
		.cbd-panel-empty   { text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; padding:30px 0; }

		/* ── Item groups ────────────────────────── */
		.cbd-item-group { margin-bottom:10px; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; overflow:hidden; }
		.cbd-item-group__head {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 10px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: .6px;
			color: #0C447C;
			background: #E6F1FB;
			padding: 6px 10px;
			border-radius: 0;
			margin-bottom: 0;
		}
		.cbd-item-group__total { font-size:12px; color:#0C447C; font-weight:700; }

		.cbd-item-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 6px 10px;
			border-bottom: 1px solid var(--border-color,#d1d8dd);
			gap: 16px;
		}
		.cbd-item-row:last-child { border-bottom:none; }
		.cbd-item-row:hover { background: var(--control-bg,#f7f7f7); }
		.cbd-item-row__left  { flex:1; min-width:0; }
		.cbd-item-row__right { flex-shrink:0; text-align:right; min-width:70px; }
		.cbd-item-row__name   { font-size:12px; font-weight:500; color:var(--text-color,#1c2126); line-height:1.3; }
		.cbd-item-row__sub    { font-size:10px; color:var(--text-muted,#8d99a6); margin-top:1px; }
		.cbd-item-row__note   { font-size:10px; color:var(--text-muted,#8d99a6); font-style:italic; margin-top:1px; }
		.cbd-item-row__amount { font-size:13px; font-weight:700; color:var(--text-color,#1c2126); }
		.cbd-item-row__years  { display:flex; gap:5px; flex-wrap:wrap; margin-top:3px; justify-content:flex-end; }
		.cbd-item-row__years span { font-size:10px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); padding:1px 5px; border-radius:3px; }





		/* ── Frappe navbar suppress when panels open ── */
		body.cbd-panels-open .navbar,
		body.cbd-panels-open .container-fluid.page-container > .row > .col:first-child {
			z-index: 1 !important;
		}

		/* ── Panel header actions ──────────────── */
		.cbd-panel__header-actions {
			display: flex;
			align-items: center;
			gap: 8px;
			flex-shrink: 0;
		}
		/* .cbd-close-both-btn removed — replaced by centre floating button */

		/* ── Line items table ───────────────────── */
		.cbd-li-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 12px;
			border: 1px solid var(--border-color,#d1d8dd);
		}
		.cbd-li-table th {
			padding: 6px 10px;
			text-align: left;
			font-size: 10px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: .4px;
			color: var(--text-muted,#8d99a6);
			background: var(--control-bg,#f7f7f7);
			border: 1px solid var(--border-color,#d1d8dd);
			white-space: nowrap;
		}
		.cbd-li-table td {
			padding: 6px 10px;
			color: var(--text-color,#1c2126);
			border: 1px solid var(--border-color,#d1d8dd);
			vertical-align: middle;
		}
		.cbd-li-table tbody tr:hover td { background: var(--control-bg,#f7f7f7); }
		.cbd-li-r { text-align: right !important; }
		.cbd-li-amt { font-weight: 700; color: var(--text-color,#1c2126); }
		.cbd-li-name { font-size: 12px; font-weight: 500; color: var(--text-color,#1c2126); }
		.cbd-li-note { font-size: 10px; color: var(--text-muted,#8d99a6); font-style: italic; margin-top: 2px; }

		/* ── Collapsible group head ─────────────── */
		.cbd-item-group__head--toggle {
			cursor: pointer;
			user-select: none;
		}
		.cbd-item-group__head--toggle:hover {
			filter: brightness(.96);
		}
		.cbd-igh-left {
			display: flex;
			align-items: center;
			gap: 6px;
		}
		.cbd-igh-chevron {
			font-size: 9px;
			color: #0C447C;
			transition: transform .18s ease;
			display: inline-block;
		}
		.cbd-item-group__body {
			overflow: hidden;
			transition: max-height .22s ease;
			max-height: 2000px;
		}
		.cbd-item-group__body--collapsed {
			max-height: 0 !important;
		}

		/* ── Sticky panel total ─────────────────── */
		.cbd-panel__sticky-total {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 10px 18px;
			background: #E6F1FB;
			border-top: 1px solid #B5D4F4;
			font-size: 13px;
			font-weight: 700;
			color: #0C447C;
			flex-shrink: 0;
		}

		/* ── YTD bar ────────────────────────────── */
		.cbd-ytd-bar {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 6px;
			padding: 7px 10px;
			background: #EEEDFE;
			border-radius: 6px;
			margin-bottom: 10px;
			font-size: 11px;
			color: #3C3489;
		}
		.cbd-ytd-badge {
			display: inline-flex;
			align-items: center;
			padding: 2px 7px;
			background: #534AB7;
			color: #fff;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 700;
			letter-spacing: .5px;
			flex-shrink: 0;
		}
		.cbd-ytd-label { color: #3C3489; }
		.cbd-ytd-label b { color: #26215C; }
		.cbd-ytd-month {
			display: inline-flex;
			padding: 1px 6px;
			background: #CECBF6;
			color: #26215C;
			border-radius: 3px;
			font-size: 10px;
			font-weight: 600;
			margin-left: 2px;
		}

		/* ── Month breakdown columns ─────────────── */
		.cbd-li-month-col {
			color: var(--text-muted,#8d99a6);
			font-size: 11px;
			white-space: nowrap;
		}
		.cbd-li-sub {
			color: var(--text-muted,#8d99a6);
			font-size: 11px;
		}

		/* ── Filter row (2 cols) ───────────────── */
		.cbd-filter-row {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 10px;
		}
		.cbd-filter-col { min-width: 0; }

		/* ── Frappe MultiSelectList overrides ───── */
		#cbd_month_multiselect .form-group,
		#cbd_fy_multiselect .form-group { margin-bottom: 0; }

		#cbd_month_multiselect .control-label,
		#cbd_fy_multiselect .control-label { display: none; }

		#cbd_month_multiselect .awesomplete,
		#cbd_fy_multiselect .awesomplete { width: 100%; }

		#cbd_month_multiselect input.input-with-feedback,
		#cbd_fy_multiselect input.input-with-feedback {
			height: 28px;
			padding: 3px 8px;
			font-size: 12px;
			border-radius: 5px;
		}
		#cbd_month_multiselect .multiselect-list,
		#cbd_fy_multiselect .multiselect-list {
			display: flex;
			flex-wrap: wrap;
			gap: 3px;
			margin-top: 5px;
		}
		#cbd_month_multiselect .btn-xs,
		#cbd_fy_multiselect .btn-xs {
			padding: 2px 7px;
			font-size: 11px;
			border-radius: 10px;
			background: #E6F1FB;
			color: #0C447C;
			border: 1px solid #B5D4F4;
		}
		#cbd_fy_multiselect .btn-xs {
			background: #EEEDFE;
			color: #3C3489;
			border-color: #AFA9EC;
		}

		/* ── Centre close button ───────────────── */
		.cbd-centre-close {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 2005;
			display: none;
			align-items: center;
			gap: 6px;
			padding: 10px 18px;
			background: #1c2126;
			color: #fff;
			border: none;
			border-radius: 24px;
			font-size: 13px;
			font-weight: 600;
			cursor: pointer;
			box-shadow: 0 4px 20px rgba(0,0,0,.4);
			transition: background .15s, transform .15s;
		}
		.cbd-centre-close:hover {
			background: #A32D2D;
			transform: translate(-50%, -50%) scale(1.04);
		}
		.cbd-centre-close--visible { display: flex; }

		/* ── Expand-all checkbox ────────────────── */
		.cbd-expand-all-label {
			display: contents;
			align-items: center;
			gap: 5px;
			font-size: 11px;
			font-weight: 500;
			color: var(--text-muted,#8d99a6);
			cursor: pointer;
			user-select: none;
			white-space: nowrap;
		}
		.cbd-expand-chk {
			width: 14px;
			height: 14px;
			cursor: pointer;
			accent-color: #378ADD;
		}

		/* ── Empty ──────────────────────────────── */
		.cbd-empty { padding:24px; text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; }

		`;
		document.head.appendChild(style);

		// bind delegation after DOM is ready
		setTimeout(() => this._bind_view_buttons(), 0);
	}
}

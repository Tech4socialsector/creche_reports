import frappe

from frappe.utils.password import get_decrypted_password
from creche_reports.api import permissions as _perm


@frappe.whitelist(allow_guest=True)
def get_social_login_providers(redirect_to=None):
	"""The same Social Login Key rows/logic Frappe's own desk login page
	renders server-side (frappe.www.login) - re-implemented as a whitelisted
	JSON endpoint since this app's login page is a Vue SPA route, not that
	Jinja template. A provider only shows once it's actually usable: enabled,
	has a client_id/base_url, AND a client_secret is set (frappe.utils.oauth's
	own get_oauth_keys would otherwise fail server-side when the user clicks
	through). allow_guest=True - this has to work before the user is signed
	in, same reasoning as get_app_branding above."""
	from frappe.utils.oauth import get_oauth2_authorize_url, get_oauth_keys

	redirect_to = redirect_to or "/creche-reports/dashboard"
	providers = frappe.get_all(
		"Social Login Key",
		filters={"enable_social_login": 1},
		fields=["name", "client_id", "base_url", "provider_name", "icon"],
		order_by="name",
	)

	out = []
	for provider in providers:
		client_secret = get_decrypted_password("Social Login Key", provider.name, "client_secret", raise_exception=False)
		if not client_secret:
			continue
		if not (provider.client_id and provider.base_url and get_oauth_keys(provider.name)):
			continue
		out.append({
			"name": provider.name,
			"provider_name": provider.provider_name,
			"icon": provider.icon or None,
			"auth_url": get_oauth2_authorize_url(provider.name, redirect_to),
		})
	return out


@frappe.whitelist(allow_guest=True)
def get_app_branding():
	"""The Vue app's configurable logo/name/login text, set from the desk via
	App Setting, for the sidebar header and login page to render.
	allow_guest=True so the (unauthenticated) login page can show it too.
	app_logo_dark falls back to app_logo itself when left blank, so the
	frontend can always just pick whichever of the two matches the active
	theme without its own separate fallback logic."""
	settings = frappe.get_single("App Setting")
	return {
		"app_name": settings.app_name or "Creche Finance Reports",
		"app_logo": settings.app_logo or None,
		"app_logo_dark": settings.app_logo_dark or settings.app_logo or None,
		"login_headline": settings.login_headline or None,
		"login_description": settings.login_description or None,
		"accent_color": settings.accent_color or None,
		"app_version": settings.app_version or None,
		"help_desk_url": settings.help_desk_url or None,
	}


@frappe.whitelist()
def get_all_partners():
    filters = {}
    permitted_partner_ids = _perm.get_effective_partner_ids()
    if permitted_partner_ids is not None:
        filters["name"] = ["in", permitted_partner_ids or ["__none__"]]
    data = frappe.get_list(
        "Creche Partners",
        filters=filters,
        fields=[
            "name",
            "partner_name",
        ],
        order_by="name asc"
    )

    return data



@frappe.whitelist()
def get_all_budgets():
    filters = _perm.apply_budget_id_scope({}, column="name")
    return frappe.get_list(
        "Creche Budget",
        filters=filters,
        fields=[
            "name",
            "budget_reference_name",
            "partner_id",
            "partner_name",
            "grant_id",
            "state",
            "district",
            "block",
            "no_of_creches",
        ],
        order_by="name asc"
    )
app_name = "creche_reports"
app_title = "Creche Finance Reports"
app_publisher = "TFSS"
app_description = "Custom reporting app for tracking allocated budgets and utilized amounts in creche finance management, with insights into expenses, balances, and financial performance."
app_email = "tech4socialsector@azimpremjifoundation.org"
app_license = "mit"

# Apps
# ------------------
doc_events = {
    "Creche Budget": {
        "after_insert":
            "creche_reports.events.send_import_email"
    },
    # "Creche utilisation": {
    #     "after_insert":
    #         "creche_reports.events.send_utilisation_import_email"
    # }
    "DocType": {
        "after_insert": "creche_reports.ai.policy.on_doctype_created"
    },
}
scheduler_events = {
    "daily": [
        "creche_reports.api.scheduler.send_utilisation_reminders",
        "creche_reports.api.scheduler.send_month_end_utilisation_reminders"
    ]
}

# AI Data Policy: seed_policies() creates the handful of doctypes this app
# ships pre-enabled for the assistant (policy.py's own SEED) - without this
# wired in, a site only gets those via a manual one-off script run (which is
# how local dev first got them; a fresh or separately-deployed site, like
# production, never did, leaving every policy disabled and the assistant
# blind to all data until someone noticed and ran it by hand - see git
# history/session notes for this exact bug). ensure_policies() then gives
# every OTHER doctype in this app's own modules a (disabled by default)
# policy, so a new doctype never starts visible to the assistant by accident
# - see creche_reports/ai/policy.py. Order matters: seed_policies() first, so
# its 8 real doctypes land enabled before ensure_policies() would otherwise
# also give unseeded ones its own disabled default (never touches an
# existing policy either way, but the explicit order keeps the intent clear).
#
# Global Search: rebuilds Global Search Settings' allow-list from every
# installed app's global_search_doctypes hook (see this file's own, below) -
# without this, declaring the hook alone wouldn't actually enable search for
# these doctypes on a fresh install until an admin manually clicked "Reset"
# on the Global Search Settings desk page - see api/sidebar.py's own comment.
#
# seed_guide: the assistant's own behaviour guide (AI Guide Section/
# Instruction - see ai/assistant.py's _load_guide and ai/seed_guide.py's own
# docstring) previously existed only by hand-typing it into one site's
# database, the same gap seed_policies already exists to close for AI Data
# Policy records just above - a separately-deployed site never got either
# without someone noticing and running it manually.
#
# widen_narrow_policies: one-time fix for every policy seeded before
# max_rows became admin-configurable (App Setting.ai_max_rows_per_request) -
# those were all created with a flat max_rows=20, which is what actually
# caused the assistant to wrongly tell users it could only show "smaller
# groups" of results even though nothing about their role/permissions
# limited them that far. Safe to run on every migrate indefinitely: it only
# ever touches a policy still sitting at that exact old default.
after_migrate = [
	"creche_reports.ai.policy.seed_policies",
	"creche_reports.ai.policy.ensure_policies",
	"creche_reports.ai.policy.widen_narrow_policies",
	"creche_reports.ai.seed_guide.seed_guide",
	"creche_reports.api.sidebar.ensure_global_search_doctypes",
	"creche_reports.api.sidebar.ensure_default_sidebar_items",
	"creche_reports.api.keyboard_shortcuts.ensure_default_keyboard_shortcuts",
	"creche_reports.api.data_import_setup.ensure_data_import_permissions",
]
# required_apps = []

# Each item in the list will be shown as an app in the apps page
# A tile on the desk's own "Apps" screen (the app-switcher grid, /apps) that
# jumps into the Vue frontend - the reverse direction of AppSidebar.vue's own
# "Go to Desk" menu item. No has_permission hook: the Vue app has no gate of
# its own beyond being logged in (same bar as reaching the desk at all), so
# this tile is visible to anyone who can already see the Apps screen.
add_to_apps_screen = [
	{
		"name": "creche_reports",
		"logo": "/assets/creche_reports/images/creche_reports_logo.svg",
		"title": "Creche Finance Reports",
		"route": "/creche-reports",
	}
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/creche_reports/css/creche_reports.css"
# Cache-busting query param: bump this value whenever response_crypto.js changes,
# since plain (non ".bundle.js") assets aren't hashed by Frappe's asset pipeline
# and browsers will otherwise keep serving a stale cached copy indefinitely.
app_include_js = "/assets/creche_reports/js/response_crypto.js?v=4"

# include js, css files in header of web template
# web_include_css = "/assets/creche_reports/css/creche_reports.css"
# web_include_js = "/assets/creche_reports/js/creche_reports.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "creche_reports/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "creche_reports/public/icons.svg"

# Website Routes
# --------------
# Client-side routes for the Creche Finance Reports Vue app (frontend/) all
# render the same www/creche-reports.html shell; vue-router then handles the
# sub-path in the browser.

website_route_rules = [
	{"from_route": "/creche-reports/<path:app_path>", "to_route": "creche-reports"},
]

# Global Search
# -------------
# Frappe's own full-text search (the desk "awesome bar", also what backs the
# Vue app's own sidebar search - see creche_reports.api.sidebar.global_search)
# only indexes/searches doctypes listed here - a doctype's fields being
# marked in_global_search alone is NOT enough, this allow-list is a second,
# separate gate (frappe.desk.doctype.global_search_settings). Without this
# hook, a fresh site install would need an admin to manually add these five
# doctypes via the Global Search Settings desk page before search found
# anything, same gap this app had until this hook was added.
global_search_doctypes = {
	"Default": [
		{"doctype": "Creche Budget"},
		{"doctype": "Creche utilisation"},
		{"doctype": "Creche Disbursement"},
		{"doctype": "Creche Caregiver Salary and Benefits"},
		{"doctype": "Creche Partners"},
	]
}

# Home Pages
# ----------

# application home page (will override Website Settings)
# Lands logged-in users on the Vue app instead of the Frappe desk - the Vue
# router's own beforeEach guard then sends '/' to '/home' from there.
home_page = "creche-reports"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "creche_reports.utils.jinja_methods",
# 	"filters": "creche_reports.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "creche_reports.install.before_install"
# after_install = "creche_reports.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "creche_reports.uninstall.before_uninstall"
# after_uninstall = "creche_reports.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "creche_reports.utils.before_app_install"
# after_app_install = "creche_reports.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "creche_reports.utils.before_app_uninstall"
# after_app_uninstall = "creche_reports.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "creche_reports.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"creche_reports.tasks.all"
# 	],
# 	"daily": [
# 		"creche_reports.tasks.daily"
# 	],
# 	"hourly": [
# 		"creche_reports.tasks.hourly"
# 	],
# 	"weekly": [
# 		"creche_reports.tasks.weekly"
# 	],
# 	"monthly": [
# 		"creche_reports.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "creche_reports.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "creche_reports.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "creche_reports.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "creche_reports.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["creche_reports.utils.before_request"]
after_request = ["creche_reports.utils.response_crypto.encrypt_response"]

# Job Events
# ----------
# before_job = ["creche_reports.utils.before_job"]
# after_job = ["creche_reports.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"creche_reports.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
export_python_type_annotations = True

# Require all whitelisted methods to have type annotations
require_type_annotated_api_methods = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []


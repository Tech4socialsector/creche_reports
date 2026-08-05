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
    # }scheduler_events = {

}
# scheduler_events = {
#     "daily": [
#         "creche_reports.api.scheduler.send_utilisation_reminders"
#     ]
# }
scheduler_events = {
    "cron": {
        "*/5 * * * *": [
            "creche_reports.api.scheduler.send_utilisation_reminders"
        ]
    }
}
# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "creche_reports",
# 		"logo": "/assets/creche_reports/logo.png",
# 		"title": "Creche Finance Reports",
# 		"route": "/creche_reports",
# 		"has_permission": "creche_reports.api.permission.has_app_permission"
# 	}
# ]

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

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

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


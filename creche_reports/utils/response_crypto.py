"""Obfuscates JSON responses for creche_reports.api.* whitelisted calls.

NOTE: this hides response bodies from a casual glance at the browser Network
tab. It is NOT a security boundary — the decryption key ships in the JS
bundle served to the same browser, so anyone with DevTools access to that
page can read the key and decrypt the payload. Access control still lives
entirely in frappe.whitelist()/permissions; this module must never be relied
on to restrict who can see data.
"""

import base64
import hashlib
import json

import frappe
from cryptography.fernet import Fernet

RESPONSE_CRYPTO_PREFIX = "creche_reports.api."

# The frontend must fetch the key itself before it can decrypt anything else,
# so this one method's own response is never wrapped.
KEY_ENDPOINT = "creche_reports.utils.response_crypto.get_response_crypto_key"


def _fernet_key() -> bytes:
    secret = frappe.conf.get("creche_reports_response_key")
    if not secret:
        frappe.throw("Missing creche_reports_response_key in site_config.json")
    return base64.urlsafe_b64encode(hashlib.sha256(str(secret).encode()).digest())


def _current_cmd(request) -> str:
    cmd = frappe.local.form_dict.get("cmd") if getattr(frappe.local, "form_dict", None) else None
    if cmd:
        return str(cmd)
    path = request.path or ""
    prefix = "/api/method/"
    return path[len(prefix):] if path.startswith(prefix) else ""


def encrypt_response(response=None, request=None, **kwargs):
    """after_request hook: replaces the JSON body with {"enc": "<token>"} for our API calls."""
    if response is None or request is None:
        return
    cmd = _current_cmd(request)
    if cmd == KEY_ENDPOINT or not cmd.startswith(RESPONSE_CRYPTO_PREFIX):
        return
    if "application/json" not in (response.mimetype or ""):
        return
    if not response.data:
        return

    token = Fernet(_fernet_key()).encrypt(response.data).decode()
    response.set_data(json.dumps({"enc": token}).encode())


@frappe.whitelist()
def get_response_crypto_key():
    """Returns the raw Fernet key (base64url) so the logged-in frontend can decrypt responses."""
    return _fernet_key().decode()

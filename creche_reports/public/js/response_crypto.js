// Transparently decrypts creche_reports.api.* responses that the backend
// wraps as {"enc": "<fernet-token>"} (see utils/response_crypto.py).
//
// NOTE: this only obscures the raw bytes in the Network tab. The key below
// ships in this file, so anyone with DevTools access to this page can read
// it and decrypt any captured token. It is NOT an access-control mechanism —
// permissions are enforced entirely on the server via frappe.whitelist().
(function () {
	// Must match site_config.json's "creche_reports_response_key".
	let fernetKeyBytes = null;

	async function loadKey() {
		if (fernetKeyBytes) return fernetKeyBytes;
		const res = await fetch("/api/method/creche_reports.utils.response_crypto.get_response_crypto_key", {
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
		});
		const body = await res.json();
		fernetKeyBytes = b64urlDecode(body.message);
		return fernetKeyBytes;
	}

	function b64urlDecode(str) {
		str = str.replace(/-/g, "+").replace(/_/g, "/");
		while (str.length % 4) str += "=";
		const bin = atob(str);
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return bytes;
	}

	function concatBytes(...arrs) {
		const total = arrs.reduce((n, a) => n + a.length, 0);
		const out = new Uint8Array(total);
		let offset = 0;
		for (const a of arrs) {
			out.set(a, offset);
			offset += a.length;
		}
		return out;
	}

	async function hmacSha256(keyBytes, dataBytes) {
		const key = await crypto.subtle.importKey(
			"raw",
			keyBytes,
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign", "verify"]
		);
		return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
	}

	async function fernetDecrypt(token) {
		const key = await loadKey();
		const signingKey = key.slice(0, 16);
		const encryptionKey = key.slice(16, 32);

		const raw = b64urlDecode(token);
		if (raw[0] !== 0x80) throw new Error("Unsupported Fernet version");

		const hmacTag = raw.slice(raw.length - 32);
		const payload = raw.slice(0, raw.length - 32);
		const iv = payload.slice(9, 25);
		const ciphertext = payload.slice(25);

		const expectedTag = await hmacSha256(signingKey, payload);
		if (!timingSafeEqual(expectedTag, hmacTag)) {
			throw new Error("Fernet signature mismatch");
		}

		const cryptoKey = await crypto.subtle.importKey(
			"raw",
			encryptionKey,
			{ name: "AES-CBC" },
			false,
			["decrypt"]
		);
		const plaintext = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, ciphertext);
		return new TextDecoder().decode(plaintext);
	}

	function timingSafeEqual(a, b) {
		if (a.length !== b.length) return false;
		let diff = 0;
		for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
		return diff === 0;
	}

	async function maybeDecrypt(data) {
		if (data && typeof data === "object" && typeof data.enc === "string") {
			const json = await fernetDecrypt(data.enc);
			return JSON.parse(json);
		}
		return data;
	}

	// Wrap frappe.call — covers the vast majority of call sites.
	//
	// frappe.call is used two different ways in this codebase:
	//   1. frappe.call({..., callback: (data) => ...})   — data comes through opts.callback
	//   2. frappe.call({...}).then(r => ...)              — data comes through the RETURNED
	//      jQuery promise directly, entirely independent of opts.callback
	// Both paths carry the raw (possibly still-encrypted) response, so both
	// must be decrypted — decrypting only the callback left path (2) reading
	// {enc: "..."} as if it were real data (e.g. r.message resolving to
	// undefined instead of the actual list).
	const originalCall = frappe.call;
	frappe.call = function (opts) {
		if (typeof arguments[0] === "string") {
			opts = { method: arguments[0], args: arguments[1], callback: arguments[2], headers: arguments[3] };
		}
		const originalCallback = opts.callback;
		opts.callback = function (data, responseText) {
			maybeDecrypt(data).then((decrypted) => {
				if (originalCallback) originalCallback(decrypted, responseText);
			});
		};
		const promise = originalCall(opts);
		if (promise && typeof promise.then === "function") {
			return promise.then((data) => maybeDecrypt(data));
		}
		return promise;
	};

	// Wrap frappe.xcall — used for promise-style calls.
	const originalXcall = frappe.xcall;
	frappe.xcall = function (method, params, type, opts = {}) {
		return new Promise((resolve, reject) => {
			frappe.call({
				method,
				args: params,
				type: type || "POST",
				callback: (r) => resolve(r.message),
				error: (r) => reject(r?.message),
				...opts,
			});
		});
	};

	// Wrap window.fetch — several pages call creche_reports.api.* endpoints
	// directly via fetch() instead of frappe.call, bypassing the wrapper
	// above. Only rewrites the response's .json() so callers using res.json()
	// transparently get decrypted data; everything else (status, headers,
	// blob() for file downloads, etc.) passes through untouched.
	const originalFetch = window.fetch;
	window.fetch = function (...args) {
		return originalFetch.apply(this, args).then((response) => {
			const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
			if (!url.includes("/api/method/creche_reports.")) return response;
			if (url.includes("get_response_crypto_key")) return response;

			const originalJson = response.json.bind(response);
			response.json = function () {
				return originalJson().then((data) => maybeDecrypt(data));
			};
			return response;
		});
	};
})();

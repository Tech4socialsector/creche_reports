// Copyright (c) 2026, TFSS and contributors
// For license information, please see license.txt

// The key_combo field is never typed by hand - instead, focusing it starts a
// "listening..." capture mode: the next keydown while it's focused builds a
// normalized "ctrl+shift+k" style string from the event's own modifier flags
// + key, writes that into the field, and blurs it. This mirrors (on the desk
// side) the exact format the frontend's useKeyboardShortcuts.js composable
// parses back out of key_combo - both sides must agree on the string shape,
// so building it is kept to this one normalize_combo() function rather than
// re-derived differently on each side.
frappe.ui.form.on("Keyboard Shortcut", {
	refresh(frm) {
		setup_combo_capture(frm);
	},
});

function setup_combo_capture(frm) {
	const $wrapper = frm.get_field("key_combo").$wrapper;
	const $input = $wrapper.find("input");
	if (!$input.length || $input.data("combo-capture-bound")) return;
	$input.data("combo-capture-bound", true);

	const placeholder_idle = "Click here, then press your key combo…";
	const placeholder_listening = "Listening… press a key combo (Esc to cancel)";

	$input.prop("readonly", true);
	$input.attr("placeholder", placeholder_idle);

	// No app-wide desk CSS file exists for this app to add a class to, so the
	// "listening..." state is styled inline here rather than introducing a
	// new CSS asset + hooks.py entry for one field's highlight.
	function start_listening() {
		$input.attr("placeholder", placeholder_listening);
		$input.css({
			"border-color": "var(--text-danger, #e03131)",
			"box-shadow": "0 0 0 2px rgba(224, 49, 49, 0.15)",
		});
	}

	function stop_listening() {
		$input.attr("placeholder", placeholder_idle);
		$input.css({ "border-color": "", "box-shadow": "" });
	}

	$input.on("focus", start_listening);
	$input.on("blur", stop_listening);

	$input.on("keydown", (e) => {
		e.preventDefault();
		e.stopPropagation();

		if (e.key === "Escape") {
			$input.trigger("blur");
			return;
		}

		// A bare modifier key press (just pressing Ctrl by itself, before the
		// real key) isn't a combo yet - keep listening instead of capturing
		// "ctrl" alone.
		if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return;

		const combo = normalize_combo(e);
		if (!combo) return;

		frm.set_value("key_combo", combo);
		$input.trigger("blur");
	});
}

// Builds the same "mod+shift+k" style string this app's frontend
// (useKeyboardShortcuts.js) parses: modifiers first in a fixed order (ctrl/
// meta collapse to "mod" so the same row works as either Ctrl or Cmd
// depending on the user's OS, then shift, then alt), lowercase, joined with
// "+", then the key itself lowercased (e.g. "k", "arrowdown", "/").
function normalize_combo(e) {
	const parts = [];
	if (e.ctrlKey || e.metaKey) parts.push("mod");
	if (e.shiftKey) parts.push("shift");
	if (e.altKey) parts.push("alt");

	const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
	// Modifier-only combos handled above already return before this point,
	// so `key` here is always the "real" key of the combo.
	parts.push(key);

	return parts.join("+");
}

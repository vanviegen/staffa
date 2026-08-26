import A from "aberdeen";
import { drawSlot } from "../core.js";
import { bindKey, formatKey, getActiveKeyBindings } from "../keys.js";
import { dialog } from "./dialog.js";

A.insertGlobalCss({
	".s-keyhelp": {
		"&": "display:flex flex-direction:column gap:$1 min-width:14rem",
		"> div": "display:flex align-items:baseline justify-content:space-between gap:$4",
		"kbd": "font-family:inherit font-size:0.85em fg:$s-muted white-space:nowrap border: 1px solid $s-faint; r:$s-radius-sm padding: 0 0.4em;",
	},
});

/** Non-null while the overview is up; calling it closes the dialog. */
let closeHelp: (() => void) | null = null;

/**
 * The shortcut overview: a dialog listing what a keypress could do *right now*
 * — every described binding the keyboard focus and any open modal leave in
 * effect: buttons under their label, menu items under theirs, {@link bindKey}
 * bindings under the description they were given.
 *
 * It's a cheat-sheet, not a modal: the shortcuts it lists keep working, and any
 * keypress closes it *and* still lands — so the key you just looked up can be
 * pressed right there. That is also what keeps the listing honest: focus cannot
 * move while it is up (a click lands on the backdrop, a key closes it), so what
 * was true when it opened stays true. Bound to `?` (and `mod+?`, which also
 * works while typing in a field) by default — see {@link setKeyHelp}. Calling
 * this while the overview is already up closes it, which is what lets that `?`
 * toggle.
 */
export function showKeyHelp(): void {
	if (closeHelp) {
		closeHelp();
		return;
	}
	// What a keypress could do at the moment of asking, snapshotted before the
	// overview's own dialog (whose Esc shadows the Esc row shown here) exists.
	// Focus cannot move while the overview is up, so the listing stays true —
	// except for Esc itself, which dismisses the overview first.
	const entries = getActiveKeyBindings(document.activeElement);
	void dialog({
		header: "Keyboard shortcuts",
		// Usually pressed into being from the global `?` handler, where there is
		// no scope to tie the dialog's life to.
		cancelWithScope: false,
		// The whole point: the keys it lists stay pressable while it is up.
		keyboardTransparent: true,
		onClose: () => { closeHelp = null; },
		content: (close) => {
			closeHelp = close;

			// Any keypress closes the overview, in the capture phase so the key
			// then travels on to whoever handles it. Except: bare modifiers (the
			// combination they start still needs reading), Esc (the dialog's own
			// close, handled there) and `?` (the toggle binding's).
			const closer = (e: KeyboardEvent) => {
				if (e.repeat || ["Control", "Shift", "Alt", "Meta", "Escape", "?"].includes(e.key)) return;
				close();
			};
			document.addEventListener("keydown", closer, true);
			A.clean(() => document.removeEventListener("keydown", closer, true));

			A("div.s-keyhelp", () => {
				for (const [keyStr, binding] of entries) {
					if (binding.description === undefined) continue;
					A("div", () => {
						A("span", () => drawSlot(binding.description));
						A("kbd text=", formatKey(keyStr));
					});
				}
			});
		},
	});
}

/** Whether the default `?` / `mod+?` bindings are on. */
const $enabled = A.proxy(true);

/**
 * Turn the default overview shortcuts off (or back on): `?` — free, like any
 * unmodified key, whenever nothing is being typed into — and `mod+?`, which
 * reaches the overview even from inside a text field. On by default.
 */
export function setKeyHelp(enabled: boolean): void {
	$enabled.value = enabled;
}

// Global bindings, so they keep working while a dialog is up — the overview
// should answer anywhere. It lists itself under the `mod+?` spelling, the one
// that is true everywhere, a text field included; the bare `?` stays quiet.
A(() => {
	if (!$enabled.value) return;
	bindKey("?", undefined, showKeyHelp, "global");
	bindKey("mod+?", "This overview", showKeyHelp, "global");
});

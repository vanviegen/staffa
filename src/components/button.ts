import A from "aberdeen";
import { type Slot, type Attributes, drawSlot } from "../core.js";

/** Options for {@link button}. */
export interface ButtonOptions {
	/** Button content: a string for plain text, or a function for custom markup. */
	content?: Slot;
	/** Leading icon/adornment, drawn before the label. */
	icon?: Slot;
	/** Click handler. */
	click?: (event: Event) => void;
	/** Disables the button. */
	disabled?: boolean;
	/** Native button behaviour. Defaults to `"button"`. */
	type?: "button" | "submit" | "reset";
	/** Render as a link (`<a role=button>`) pointing here instead of a `<button>`. */
	href?: string;
	/** Accessible label, when the button has only an icon. */
	ariaLabel?: string;
	/**
	 * Aberdeen attr/style string applied to the button. A button is a surface, so
	 * pass surface modifier classes here to restyle it, e.g. `".danger"`,
	 * `".danger .outlined"`, or `".neutral"` for a neutral button. Defaults to a
	 * filled `.primary` surface.
	 *
	 * Size is set here too, with `.small` or `.large` (medium is the default and
	 * needs no class), e.g. `".danger .small"`. A `.small`/`.large` parent (such
	 * as a {@link buttonGroup}) also sizes its buttons, so you can set it once.
	 */
	attrs?: Attributes;
}

// The button is a `.s-s` surface (defaulting to `.primary` in button() below), so
// its colours, border, and border-radius come from the surface classes in theme.ts.
// This rule only handles layout, focus, hover and sizing.
A.insertGlobalCss({
	".s-btn": {
		"&":
			"display:inline-flex align-items:center justify-content:center gap:$2 " +
			"font-weight:450 line-height:1.2 white-space:nowrap cursor:pointer text-decoration:none " +
			"padding: 0.5em 1em; " +
			"transition: background 0.15s, border-color 0.15s, color 0.15s, filter 0.15s, box-shadow 0.15s, transform 0.08s;",
		// Focus ring via `outline` (not box-shadow) so it survives a `.no-shadow`
		// (which hard-clears box-shadow). Modern browsers round it to the border-radius.
		"&:focus-visible": "outline: 3px solid $s-focus; outline-offset: 1px;",
		// The button carries `.shadow` (added in button() below); on a filled accent
		// surface that resolves to the signature self-coloured glow, on a neutral
		// `.neutral` button to nothing, on tonal/outlined to nothing — all via theme.ts.
		"&:hover": "filter: brightness(1.06)",
		// Tonal/outlined hover deepen their translucent fill; a neutral `.neutral`
		// button (which is already near-white) darkens toward its ink instead.
		"&.tonal:hover, &.outlined:hover": "background: color-mix(in srgb, $s-bg 24%, transparent);",
		"&.neutral:hover": "filter:none background: color-mix(in srgb, $s-text 8%, $s-bg);",
		// Subtle press feedback.
		"&:active:not(:disabled)": "transform: translateY(1px)",
		// Size: set on the button itself, or inherited from a `.small`/`.large`
		// parent (e.g. a buttonGroup), so a container can size all its buttons at once.
		"&.small, .small > &": "padding: 0.32em 0.7em; font-size:0.85em",
		"&.large, .large > &": "padding: 0.66em 1.3em; font-size:1.1em",
	},
});

/**
 * A button. Tonal and outlined variants show a border; filled variants rely on
 * their solid background for affordance.
 *
 * Shortcut: pass a string to use it as the label, or a function for custom
 * content.
 *
 * **Tip:** pair `href` with Aberdeen's `interceptLinks()` (called once at app
 * startup) for SPA-style navigation without manual click handlers:
 * ```ts
 * import {interceptLinks} from from "aberdeen/route";
 * interceptLinks(); // once at root
 * S.button({ href: "/dashboard", content: "Dashboard" }); // navigates via router
 * ```
 *
 * @example
 * ```ts
 * S.button({ content: "Save", click: S.alert("Saved.") });
 * S.button({ content: "Cancel", attrs: ".neutral", click: cancel }); // neutral button
 * S.button({ content: "Delete", attrs: ".danger .outlined", click: del });
 * S.button("Cancel");                        // shorthand for { content: "Cancel" }
 * S.button({ href: "/docs", content: "Docs" }); // renders an <a role=button>
 * ```
 */
export function button(opts: ButtonOptions | Slot = {}): void {
	const o: ButtonOptions = typeof opts === "string" || typeof opts === "function" ? { content: opts } : opts;

	const tag = o.href != null ? "a" : "button";

	// A bare `.s-s` is a filled accent surface defaulting to `.primary` (see
	// theme.ts) — the signature CTA. The caller's `attrs` simply names another
	// role (`.danger`, `.neutral`, a custom `.brand`) or variant (`.outlined`); no
	// role detection needed, since the default lives in CSS, not here.
	A(`${tag}.s-btn.s-s.shadow`, o.attrs, () => {
		if (o.href != null) {
			A(`href=${o.href} role=button`);
			if (o.disabled) A("aria-disabled=true");
		} else {
			A("type=", o.type ?? "button");
			if (o.disabled) A("disabled=true");
		}
		if (o.ariaLabel) A("aria-label=", o.ariaLabel);
		if (o.click) A("click=", o.click);

		drawSlot(o.icon);
		drawSlot(o.content);
	});
}

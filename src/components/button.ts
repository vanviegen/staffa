import A from "aberdeen";
import { type Content, type Slot, type Attributes, drawSlot } from "../core.js";

/** Options for {@link button}. */
export interface ButtonOptions {
	/** Button label text. */
	text?: string;
	/** Custom content (overrides {@link ButtonOptions.text | text}). */
	content?: Content;
	/** Leading icon/adornment, drawn before the label. */
	icon?: Slot;
	/** Click handler. */
	click?: (event: Event) => void;
	/** Size. Defaults to `"md"`. */
	size?: "sm" | "md" | "lg";
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
	 * `".neutral .outlined"`. Defaults to a filled `.primary` surface.
	 */
	attrs?: Attributes;
}

// The button is a `.s-s` surface (defaulting to `.primary` in button() below), so
// its colours come from the surface classes in theme.ts. This rule only handles
// layout, border, focus, hover and sizing.
A.insertGlobalCss({
	".s-btn": {
		"&":
			"display:inline-flex align-items:center justify-content:center gap:$2 " +
			"font-weight:600 line-height:1.2 white-space:nowrap cursor:pointer text-decoration:none " +
			"border: 1px solid $s-border; r: $s-radius; padding: 0.5em 1em; " +
			"transition: background 0.15s, border-color 0.15s, color 0.15s, filter 0.15s, box-shadow 0.15s, transform 0.08s;",
		"&:focus-visible": "outline:none box-shadow: 0 0 0 3px $s-focus;",
		"&:disabled, &[aria-disabled=true]": "opacity:0.45 cursor:not-allowed pointer-events:none filter:saturate(0.6)",
		"&:hover": "filter: brightness(1.08)",
		"&.tonal:hover, &.outlined:hover": "background: color-mix(in srgb, $s-b 26%, transparent);",
		// Subtle press feedback.
		"&:active:not(:disabled):not([aria-disabled=true])": "transform: translateY(1px)",
		"&.s-sm": "padding: 0.32em 0.7em; font-size:0.85em",
		"&.s-lg": "padding: 0.66em 1.3em; font-size:1.1em",
	},
});

/**
 * A button. Always carries at least a visible border so its affordance is
 * obvious at a glance.
 *
 * Shortcut: pass a string to use it as the label, or a function for custom
 * content.
 *
 * **Tip:** pair `href` with Aberdeen's `interceptLinks()` (called once at app
 * startup) for SPA-style navigation without manual click handlers:
 * ```ts
 * interceptLinks(); // once at root
 * S.button({ href: "/dashboard", text: "Dashboard" }); // navigates via router
 * ```
 *
 * @example
 * ```ts
 * S.button({ text: "Save", click: save });
 * S.button({ text: "Delete", attrs: ".danger .outlined", click: del });
 * S.button("Cancel");                        // shorthand for { text: "Cancel" }
 * S.button({ href: "/docs", text: "Docs" }); // renders an <a role=button>
 * ```
 */
export function button(opts: ButtonOptions | string | Content = {}): void {
	const o: ButtonOptions = typeof opts === "string" ? { text: opts } : typeof opts === "function" ? { content: opts } : opts;

	const tag = o.href != null ? "a" : "button";
	const sizeCls = o.size != null ? `.s-${o.size}` : "";

	// A filled `.primary` surface by default; `attrs` (applied after) can override
	// the role/variant with e.g. `.danger`, `.neutral .outlined`.
	A(`${tag}.s-btn.s-s.primary${sizeCls}`, o.attrs, () => {
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
		if (o.content) o.content();
		else if (o.text != null) A("#", o.text);
	});
}

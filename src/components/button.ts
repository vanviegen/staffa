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
	 * `".neutral .outlined"`. Defaults to a filled `.primary` surface.
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
			"font-weight:600 line-height:1.2 white-space:nowrap cursor:pointer text-decoration:none " +
			"border:0 padding: 0.5em 1em; " +
			"transition: background 0.15s, border-color 0.15s, color 0.15s, filter 0.15s, box-shadow 0.15s, transform 0.08s;",
		"&:focus-visible": "outline:none box-shadow: 0 0 0 3px $s-focus;",
		// Hover feedback is colour-only (no movement). The filled `.gradient` CTA
		// below layers a deeper shadow on top, so it still reads as the signature action.
		"&:hover": "filter: brightness(1.08)",
		"&.tonal:hover, &.outlined:hover": "background: color-mix(in srgb, $s-b 26%, transparent);",
		// A filled `.gradient` button (the default) is the app's signature call to
		// action: a borderless gradient with a hairline top highlight (a hint of
		// top-lighting that sells the fill as a lit, rounded shape) over a soft glow.
		// The gradient fill itself comes from the `.s-s.gradient` surface rule in
		// theme.ts. No border: a filled gradient reads as one solid shape. Dropping
		// the border (rather than making it transparent) also sidesteps a Chromium
		// artifact where a gradient clipped to a transparent rounded border fringes
		// the edge with the gradient's far colour.
		"&.gradient:not(.tonal):not(.outlined)":
			"box-shadow: inset 0 1px 0 color-mix(in srgb, white 25%, transparent), $s-glow;",
		"&.gradient:not(.tonal):not(.outlined):hover":
			"filter: brightness(1.05); box-shadow: inset 0 1px 0 color-mix(in srgb, white 25%, transparent), 0 7px 18px color-mix(in srgb, $s-primary 34%, transparent);",
		// Subtle press feedback.
		"&:active:not(:disabled)": "transform: translateY(1px)",
		// Size: set on the button itself, or inherited from a `.small`/`.large`
		// parent (e.g. a buttonGroup), so a container can size all its buttons at once.
		"&.small, .small > &": "padding: 0.32em 0.7em; font-size:0.85em",
		"&.large, .large > &": "padding: 0.66em 1.3em; font-size:1.1em",
	},
});

// Surface-role classes a caller may pass in `attrs`. When one is present we skip
// the default `.gradient` base so the two roles don't stack on one element.
const ROLE_CLASS = /\.(gradient|primary|secondary|neutral|danger|success|warning|base|panel|raised)(\.|\s|$)/;

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
 * S.button({ content: "Delete", attrs: ".danger .outlined", click: del });
 * S.button("Cancel");                        // shorthand for { content: "Cancel" }
 * S.button({ href: "/docs", content: "Docs" }); // renders an <a role=button>
 * ```
 */
export function button(opts: ButtonOptions | Slot = {}): void {
	const o: ButtonOptions = typeof opts === "string" || typeof opts === "function" ? { content: opts } : opts;

	const tag = o.href != null ? "a" : "button";

	// A filled `.gradient` surface by default — the signature CTA. If the caller's
	// `attrs` already names a surface role we omit the default, so `.danger`,
	// `.neutral .outlined`, etc. fully take over (rather than stacking two roles).
	// A bare variant/size (`.outlined`, `.small`) keeps the gradient base.
	const role = o.attrs && ROLE_CLASS.test(o.attrs) ? "" : ".gradient";
	A(`${tag}.s-btn.s-s${role}`, o.attrs, () => {
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

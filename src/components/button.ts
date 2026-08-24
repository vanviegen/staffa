import A from "aberdeen";
import { type Slot, type Attributes, drawSlot } from "../core.js";

/** Options for {@link iconButton}. */
export interface IconButtonOptions {
	/** The glyph, usually one of the `staffa/icons` draw functions. */
	icon: Slot;
	/** What it does, for screen readers. Required: there is no visible text to read. */
	ariaLabel: string;
	/** Click handler. */
	click?: (event: Event) => void;
	/** Render as a link (`<a role=button>`) pointing here instead of a `<button>`. */
	href?: string;
	/** Disables it. */
	disabled?: boolean;
	/**
	 * Aberdeen attr/style string applied to the button. `.small` and `.large`
	 * size the hit area (medium is the default and needs no class); a `.small`
	 * or `.large` parent sizes the ones inside it, as with {@link button}.
	 */
	attrs?: Attributes;
}

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

// Colours, border and radius come from the `.s-s` surface classes in theme.ts;
// this rule only does layout, focus, hover and sizing.
A.insertGlobalCss({
	".s-btn": {
		"&":
			"display:inline-flex align-items:center justify-content:center gap:$2 " +
			"font-weight:450 line-height:1.1 white-space:nowrap cursor:pointer text-decoration:none " +
			"padding: $m2 $m3; " +
			"transition: background 0.15s, border-color 0.15s, color 0.15s, filter 0.15s, box-shadow 0.15s, transform 0.08s;",
		// Focus ring via `outline`, not box-shadow: `.no-shadow` hard-clears box-shadow.
		"&:focus-visible": "outline: 3px solid $s-focus; outline-offset: 1px;",
		"&:hover": "filter: brightness(1.06)",
		"&.tonal:hover, &.outlined:hover": "background: color-mix(in srgb, $s-bg 24%, transparent);",
		// A `.neutral` button is already near-white, so it darkens toward its ink
		// instead of brightening.
		"&.neutral:hover": "filter:none background: color-mix(in srgb, $s-text 8%, $s-bg);",
		// The button sizes its glyph rather than trusting the caller: only a rule here
		// makes every icon in a row match. In `em`, so `.small`/`.large` scale it.
		"> svg": "width:1.25em height:1.25em",
		"&:active:not(:disabled)": "transform: translateY(1px)",
		// Also inherited from a `.small`/`.large` parent (e.g. a buttonGroup), so a
		// container can size all its buttons at once.
		"&.small, .small > &": "padding: $m1 $m2; font-size:0.85em border-radius:$s-radius-sm",
		"&.large, .large > &": "font-size:1.4em border-radius:$s-radius-lg",
	},
	// Deliberately *not* a `.s-s` surface: chrome sitting beside a title (a ✕, a ☰)
	// should read as an affordance on the bar, not as another button competing with it.
	".s-icon-btn": {
		"&":
			"display:inline-flex align-items:center justify-content:center flex-shrink:0 " +
			"width:2rem height:2rem p:0 border:0 background:transparent cursor:pointer " +
			"fg:$s-muted r:$s-radius-sm line-height:1 font-size:1rem text-decoration:none " +
			"transition: color 0.12s, background 0.12s;",
		// As on `.s-btn`: the container sizes the glyph so a row of icon buttons reads
		// as a row. CSS beats the `width`/`height` attributes the icon set writes; an
		// `attrs` override still wins over this, being an inline style.
		"> svg": "width:1.25em height:1.25em",
		"&:hover:not(:disabled):not([aria-disabled=true])":
			"fg:$s-text background: color-mix(in srgb, $s-text 10%, transparent);",
		"&:focus-visible": "outline: 3px solid $s-focus; outline-offset:1px",
		// The glyph rides the font size, so it scales with the hit area.
		"&.small, .small > &": "width:1.6rem height:1.6rem font-size:0.8rem",
		"&.large, .large > &": "width:2.4rem height:2.4rem font-size:1.2rem",
	},
});

/**
 * A bare glyph in a square hit area — no fill, no border, just ink that lifts on
 * hover. For chrome that has to sit beside something more important without
 * competing with it: a ✕ on a box, the ☰ a routed `S.main()` puts in its top bar,
 * the verbs in a {@link Panel.actions | page's actions}.
 *
 * Reach for {@link button} instead whenever the thing has a name worth reading;
 * an icon alone is unambiguous only for a handful of universal actions.
 *
 * @example
 * ```ts
 * import { trash2, share2 } from "staffa/icons";
 *
 * $panel.actions = () => {
 *   S.iconButton({ icon: share2, ariaLabel: "Share", click: share });
 *   S.iconButton({ icon: trash2, ariaLabel: "Delete", click: del, attrs: "fg:$s-danger" });
 * };
 * ```
 */
export function iconButton(opts: IconButtonOptions): void {
	const tag = opts.href != null ? "a" : "button";
	A(`${tag}.s-icon-btn`, opts.attrs, () => {
		applyActionBehavior(opts);
		A("aria-label=", opts.ariaLabel);
		drawSlot(opts.icon);
	});
}

/**
 * The link-or-button plumbing {@link button} and {@link iconButton} share. A
 * disabled link keeps `role=button` and `aria-disabled` but loses its `href`: an
 * anchor without one is out of the tab order and follows nothing, which is what
 * makes it as disabled as a `<button>`'s real `disabled` attribute.
 */
function applyActionBehavior(o: {
	href?: string;
	disabled?: boolean;
	click?: (event: Event) => void;
	type?: string;
}): void {
	if (o.href != null) {
		A("role=button");
		if (o.disabled) A("aria-disabled=true");
		else A("href=", o.href);
	} else {
		A("type=", o.type ?? "button");
		if (o.disabled) A("disabled=true");
	}
	if (o.click && !o.disabled) A("click=", o.click);
}

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

	// A bare `.s-s` is a filled `.primary` surface (see theme.ts), so no role
	// detection here: `attrs` just names another role or variant.
	A(`${tag}.s-btn.s-s.shadow`, o.attrs, () => {
		applyActionBehavior(o);
		if (o.ariaLabel) A("aria-label=", o.ariaLabel);

		drawSlot(o.icon);
		drawSlot(o.content);
	});
}

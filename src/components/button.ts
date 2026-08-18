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

// The button is a `.s-s` surface (defaulting to `.primary` in button() below), so
// its colours, border, and border-radius come from the surface classes in theme.ts.
// This rule only handles layout, focus, hover and sizing.
A.insertGlobalCss({
	".s-btn": {
		"&":
			"display:inline-flex align-items:center justify-content:center gap:$2 " +
			"font-weight:450 line-height:1.1 white-space:nowrap cursor:pointer text-decoration:none " +
			"padding: $m2 $m3; " +
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
		// The button sizes its glyph, for the same reason `.s-icon-btn` does below:
		// a caller can't know what the button beside it passed, and only a rule
		// here makes every icon in a row come out alike. It rides the font size,
		// so a `.small`/`.large` button scales its icon with its text.
		"> svg": "width:1.25em height:1.25em",
		// Subtle press feedback.
		"&:active:not(:disabled)": "transform: translateY(1px)",
		// Size: set on the button itself, or inherited from a `.small`/`.large`
		// parent (e.g. a buttonGroup), so a container can size all its buttons at once.
		"&.small, .small > &": "padding: $m1 $m2; font-size:0.85em border-radius:$s-radius-sm",
		"&.large, .large > &": "font-size:1.4em border-radius:$s-radius-lg",
	},
	// A bare glyph in a square hit area: no fill and no edge, just ink that lifts
	// on hover. Deliberately *not* a `.s-s` surface — chrome that sits beside a
	// title (a ✕, a ☰) should read as an affordance on the bar, not as
	// another button competing with it, and a filled or outlined box around a
	// 16px glyph is exactly what makes a top bar look busy.
	".s-icon-btn": {
		"&":
			"display:inline-flex align-items:center justify-content:center flex-shrink:0 " +
			"width:2rem height:2rem p:0 border:0 background:transparent cursor:pointer " +
			"fg:$s-muted r:$s-radius-sm line-height:1 font-size:1rem text-decoration:none " +
			"transition: color 0.12s, background 0.12s;",
		// The container sizes the glyph, rather than trusting whatever the caller
		// passed: a row of icon buttons only reads as a row when every glyph in it
		// is the same size, and the caller of one of them can't know about the
		// others. CSS beats the `width`/`height` attributes the icon set writes, so
		// `iconButton({ icon: trash2 })` and a hand-sized glyph come out alike; an
		// `attrs` override still wins over this, being an inline style. The same
		// rule is on `.s-btn` above and on a floating menu's rows in menu.ts, so
		// one `1.25em` governs the lot. (`S.main`'s nav rows are deliberately out
		// of it — see the note there.)
		"> svg": "width:1.25em height:1.25em",
		// The ink resolves against whatever surface it sits on, so one treatment
		// works on the page, in a box header, and on a coloured bar alike.
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
 * hover. The quiet end of the button family, for chrome that has to sit beside
 * something more important without competing with it: a ✕ on a box, the ☰ a
 * routed `S.main()` puts in its top bar, the verbs in a
 * {@link Panel.actions | page's actions}.
 *
 * Reach for {@link button} instead whenever the thing has a name worth reading;
 * an icon alone is only unambiguous for a handful of universal actions.
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
 * The link-or-button plumbing {@link button} and {@link iconButton} share:
 * href/type, disabling, label and click. A disabled link keeps `role=button`
 * and `aria-disabled` but loses its `href` — an anchor without one is out of
 * the tab order and follows nothing, which is what makes it as disabled as
 * the `<button>` form's real `disabled` attribute.
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

	// A bare `.s-s` is a filled accent surface defaulting to `.primary` (see
	// theme.ts) — the signature CTA. The caller's `attrs` simply names another
	// role (`.danger`, `.neutral`, a custom `.brand`) or variant (`.outlined`); no
	// role detection needed, since the default lives in CSS, not here.
	A(`${tag}.s-btn.s-s.shadow`, o.attrs, () => {
		applyActionBehavior(o);
		if (o.ariaLabel) A("aria-label=", o.ariaLabel);

		drawSlot(o.icon);
		drawSlot(o.content);
	});
}

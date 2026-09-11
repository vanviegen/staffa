import A from "aberdeen";
import { type Slot, type Attributes, drawSlot } from "../core.js";
import { bindKey, formatKey } from "../keys.js";
import { addTooltip } from "./tooltip.js";

/** Options for {@link iconButton}. */
export interface IconButtonOptions {
	/** The glyph, usually one of the `staffa/icons` draw functions. */
	icon: Slot;
	/**
	 * What it does, for screen readers: there is no visible text to read. Required,
	 * unless the `tooltip` is a string — that names the button just as well, and is
	 * taken as the label when this is left out.
	 */
	ariaLabel?: string;
	/**
	 * Click handler. Return a promise and the glyph becomes a spinner until it
	 * settles, with further clicks bouncing off — see {@link ButtonOptions.click}.
	 */
	click?: (event: Event) => unknown;
	/**
	 * A keyboard shortcut that presses this button — see {@link ButtonOptions.key}.
	 * It is shown after the button's `tooltip`, or alone in a tooltip of its own
	 * when there is none, and the `?` overview lists it under the button's label.
	 */
	key?: string;
	/**
	 * A tooltip, shown on hover and keyboard focus; a string renders as rich
	 * text. There is none unless you ask for one — but do consider it here, as
	 * a glyph says nothing to whoever cannot guess it. A string doubles as the
	 * `ariaLabel` when that is left out, so an icon button usually needs one
	 * option, not two. A `key` is appended to the tip, behind a `·`; pass
	 * `false` to suppress even that.
	 *
	 * Works on a disabled button too, which is where a tooltip earns its keep:
	 * it is the only room there is to say why.
	 */
	tooltip?: Slot | false;
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
	/**
	 * Click handler.
	 *
	 * **Return a promise and the button goes *busy* until it settles**: a spinner
	 * rides after the label, and clicks (and keypresses) bounce off, so a slow
	 * save can't be started twice. Nothing to wire up — `click: () => save()` on
	 * an async `save` is the whole thing, and a handler awaiting a
	 * {@link confirm} counts: the button waits for the answer with everything
	 * else. For a wait that isn't a promise, put the button in the same state
	 * yourself with `attrs: ".s-busy"`.
	 */
	click?: (event: Event) => unknown;
	/** Disables the button. */
	disabled?: boolean;
	/** Native button behaviour. Defaults to `"button"`. */
	type?: "button" | "submit" | "reset";
	/** Render as a link (`<a role=button>`) pointing here instead of a `<button>`. */
	href?: string;
	/**
	 * Accessible label, when the button has only an icon. A string `tooltip` is
	 * taken as the label of such a button when this is left out.
	 */
	ariaLabel?: string;
	/**
	 * A keyboard shortcut that presses this button: `"mod+s"`, `"f2"` — see
	 * {@link bindKey} for the spelling and which keystrokes are yours to take.
	 * It works from anywhere while the button is drawn, shows in a tooltip,
	 * reaches screen readers as `aria-keyshortcuts`, and does exactly what a
	 * click does: a `type: "submit"` submits its form, an `href` navigates. The
	 * `?` overview ({@link showKeyHelp}) lists it under the button's text (or
	 * its `ariaLabel`).
	 */
	key?: string;
	/**
	 * A tooltip, shown on hover and keyboard focus. A string renders as rich
	 * text, a function draws its own markup. There is none unless you ask for
	 * one. A `key` is appended to it, behind a `·`; pass `false` to suppress
	 * even that. On an icon-only button, a string tooltip doubles as the
	 * `ariaLabel` when that is left out.
	 *
	 * Works on a disabled button too, which is where a tooltip earns its keep:
	 * it is the only room there is to say why.
	 */
	tooltip?: Slot | false;
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
		"&:hover:not([aria-disabled=true])": "filter: brightness(1.06)",
		"&.tonal:hover:not([aria-disabled=true]), &.outlined:hover:not([aria-disabled=true])":
			"background: color-mix(in srgb, $s-bg 24%, transparent);",
		// A `.neutral` button is already near-white, so it darkens toward its ink
		// instead of brightening.
		"&.neutral:hover:not([aria-disabled=true])": "filter:none background: color-mix(in srgb, $s-text 8%, $s-bg);",
		// The button sizes its glyph rather than trusting the caller: only a rule here
		// makes every icon in a row match. In `em`, so `.small`/`.large` scale it.
		"> svg": "width:1.25em height:1.25em",
		"&:active:not(:disabled):not([aria-disabled=true])": "transform: translateY(1px)",
		// A disabled button that has something to say still takes hover, so its
		// tooltip can say it (see `applyActionBehavior`); theme.ts stops the rest.
		"&[aria-disabled=true]": "pointer-events:auto cursor:not-allowed",
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
		// A disabled button that has something to say still takes hover, so its
		// tooltip can say it (see `applyActionBehavior`); theme.ts stops the rest.
		"&[aria-disabled=true]": "pointer-events:auto cursor:not-allowed",
		// The glyph rides the font size, so it scales with the hit area.
		"&.small, .small > &": "width:1.6rem height:1.6rem font-size:0.8rem",
		"&.large, .large > &": "width:2.4rem height:2.4rem font-size:1.2rem",
	},

	// ── Busy ──────────────────────────────────────────────────────────────────
	// Raised by a promise-returning `click`, by a submitting `S.form` on its own
	// submit buttons, or by a caller who has some other wait to show. The spinner
	// is a pseudo-element, so nothing has to be redrawn to start or stop it, and
	// the flex `gap` spaces it like any other child.
	".s-btn.s-busy, .s-icon-btn.s-busy, .s-busy .s-btn[type=submit]": "pointer-events:none cursor:progress",
	".s-btn.s-busy::after, .s-icon-btn.s-busy::after, .s-busy .s-btn[type=submit]::after":
		"content:'' flex-shrink:0 width:1em height:1em r:50% " +
		"border: 2px solid currentColor; border-top-color: transparent; " +
		"animation: s-spin 0.7s linear infinite;",
	// The glyph *is* an icon button, so the spinner takes its place rather than
	// crowding in beside it.
	".s-icon-btn.s-busy > svg": "display:none",
	"@keyframes s-spin": { to: "transform: rotate(360deg)" },
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
 *   // A string `tooltip` names the button for screen readers too, so one option does.
 *   S.iconButton({ icon: share2, tooltip: "Share", click: share });
 *   // Named, but silent on hover: `ariaLabel` alone raises no tooltip.
 *   S.iconButton({ icon: trash2, ariaLabel: "Delete", click: del, attrs: "fg:$s-danger" });
 * };
 * ```
 */
export function iconButton(opts: IconButtonOptions): void {
	const tag = opts.href != null ? "a" : "button";
	const tip = opts.tooltip === false ? undefined : opts.tooltip;
	// A glyph says nothing on its own, so the button needs a name — and a tooltip
	// written as a string already is one. Said once, it serves both.
	const label = opts.ariaLabel ?? (typeof tip === "string" ? plainText(tip) : undefined);
	A(`${tag}.s-icon-btn`, opts.attrs, () => {
		applyActionBehavior(opts, tip != null);
		A("aria-label=", label);
		// Before the glyph, so a tooltip the caller adds in there is the later of
		// the two and wins the hover.
		applyTooltipAndKey(opts.tooltip, opts.key, label, opts.disabled);
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
	click?: (event: Event) => unknown;
	type?: string;
}, hasTooltip = false): void {
	if (o.href != null) {
		A("role=button");
		if (o.disabled) A("aria-disabled=true");
		else A("href=", o.href);
	} else if (o.disabled && hasTooltip) {
		// A natively `disabled` button fires no mouse events at all, so a tooltip on
		// one — usually the one saying *why* it is disabled — would never show. Say
		// it the ARIA way instead: the same dimmed, unclickable, out-of-the-tab-order
		// button (theme.ts dims it, the CSS above keeps only hover alive), but one
		// the pointer can still reach. Nothing can activate it: the `click` handler
		// is skipped below, and this one stops a `type=submit` from reaching its form
		// through a stray click or Enter.
		A("type=", o.type ?? "button");
		A("aria-disabled=true tabindex=-1");
		A("click=", (event: Event) => { event.preventDefault(); event.stopPropagation(); });
	} else {
		A("type=", o.type ?? "button");
		if (o.disabled) A("disabled=true");
	}
	if (o.click && !o.disabled) applyClick(o.click);
}

/**
 * Wire a click handler that may be asynchronous: while the promise it returned
 * is pending, the element wears `.s-busy` (spinner, no pointer events) and
 * further clicks are ignored — the double-submit guard every save button needs.
 *
 * The rejection is rethrown from a promise nobody handles, so an error in the
 * handler still reaches the console exactly as it would without us.
 */
function applyClick(click: (event: Event) => unknown): void {
	const $busy = A.proxy({ value: false });
	// Own scope: raising and dropping the class must not recreate the element,
	// which would drop keyboard focus mid-click.
	A(() => {
		if ($busy.value) A(".s-busy aria-busy=true");
	});
	A("click=", (event: Event) => {
		// A keypress on a focused button still gets here while `pointer-events:none`
		// holds the mouse off, so the guard is what actually stops the second call.
		if ($busy.value) return;
		const result = click(event) as PromiseLike<unknown> | undefined;
		if (!result || typeof result.then !== "function") return;
		$busy.value = true;
		const done = () => { $busy.value = false; };
		Promise.resolve(result).then(done, (err) => { done(); throw err; });
	});
}

/**
 * A rich-text string as a screen reader should hear it. Same pattern Aberdeen's
 * `rich=` draws with, so a tooltip standing in as the accessible name says the
 * words it shows, and not its own asterisks and brackets.
 */
function plainText(rich: string): string {
	return rich.replace(/\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g,
		(_m, bold, italic, code, link) => bold ?? italic ?? code ?? link);
}

/**
 * The tooltip and shortcut plumbing {@link button} and {@link iconButton} share:
 * show the tip, with the key appended — the only place a button can say what its
 * key is without shouting it beside the label — then bind that key and announce
 * it as `aria-keyshortcuts`. A key with no tooltip to join gets a tip of its
 * own, saying the combination and no more.
 *
 * Pressing the key clicks the element rather than calling `click` directly, so a
 * `type=submit` still submits its form and an `href` still navigates. Call this
 * inside the button's own element scope, whose element it takes and whose life
 * the binding follows. `keyLabel` is how the `?` overview names the shortcut.
 */
function applyTooltipAndKey(
	tooltip: Slot | false | undefined,
	key: string | undefined,
	keyLabel: string | undefined,
	disabled?: boolean,
): void {
	// `false` is a vow of silence: not even a key raises a tip on this one.
	if (tooltip !== false && (tooltip != null || key)) {
		addTooltip({
			tip: () => {
				drawSlot(tooltip);
				// A draw function, not a string: a key like `*` is markup to rich text.
				if (key) A("#", tooltip == null ? formatKey(key) : ` · ${formatKey(key)}`);
			},
		});
	}
	// Bound only while it can be pressed — a disabled button would otherwise
	// swallow the combination rather than leave it to whoever else wants it. The
	// overview names it by its visible text, or its aria label failing that.
	if (key && !disabled) {
		const el = A() as HTMLElement;
		A("aria-keyshortcuts=", formatKey(key, true));
		bindKey(key, keyLabel, () => el.click());
	}
}

/**
 * A button. Tonal and outlined variants show a border; filled variants rely on
 * their solid background for affordance.
 *
 * Shortcut: pass a string to use it as the label, or a function for custom
 * content.
 *
 * **Tip:** pair `href` with Aberdeen's `interceptLinks()` (called once at app
 * startup) for SPA-style navigation without manual click handlers — a routed
 * {@link main} already handles link clicks itself, so don't call it there:
 * ```ts
 * import {interceptLinks} from "aberdeen/route";
 * interceptLinks(); // once at root
 * S.button({ href: "/dashboard", content: "Dashboard" }); // navigates via router
 * ```
 *
 * @example
 * ```ts
 * S.button({ content: "Save", click: () => save() });     // async: spins while it saves
 * S.button({ content: "About", click: () => S.alert("Staffa.") });
 * S.button({ content: "Cancel", attrs: ".neutral", click: cancel }); // neutral button
 * S.button({ content: "Delete", attrs: ".danger .outlined", click: del });
 * S.button("Cancel");                        // shorthand for { content: "Cancel" }
 * S.button({ href: "/docs", content: "Docs" }); // renders an <a role=button>
 * ```
 */
export function button(opts: ButtonOptions | Slot = {}): void {
	const o: ButtonOptions = typeof opts === "string" || typeof opts === "function" ? { content: opts } : opts;

	const tag = o.href != null ? "a" : "button";
	const tip = o.tooltip === false ? undefined : o.tooltip;
	// Only a button without visible text needs naming, and a string tooltip is a
	// name: on one that has text, an aria-label would *hide* that text from AT.
	const label = o.ariaLabel ?? (o.content == null && typeof tip === "string" ? plainText(tip) : undefined);

	// A bare `.s-s` is a filled `.primary` surface (see theme.ts), so no role
	// detection here: `attrs` just names another role or variant.
	A(`${tag}.s-btn.s-s.shadow`, o.attrs, () => {
		applyActionBehavior(o, tip != null);
		if (label) A("aria-label=", label);
		// Before the content, so a tooltip the caller adds in there is the later of
		// the two and wins the hover.
		applyTooltipAndKey(o.tooltip, o.key, typeof o.content === "string" ? o.content : label, o.disabled);

		drawSlot(o.icon);
		drawSlot(o.content);
	});
}

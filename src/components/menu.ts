import A from "aberdeen";
import { matchCurrent } from "aberdeen/route";
import { type Slot, type Attributes, drawSlot, mountPortal } from "../core.js";
import { button, type ButtonOptions } from "./button.js";

/**
 * A clickable item in a menu or sidebar nav.
 *
 * **Tip:** set `href` and call Aberdeen's `interceptLinks()` once at app
 * startup for SPA-style navigation. When `href` is set, the item is
 * automatically highlighted as active whenever the current URL matches it
 * (via {@link matchCurrent}).
 */
export interface MenuItem {
	/** Label text or draw function. Strings are rendered as rich text. */
	label: Slot;
	/** Leading icon drawn before the label. */
	icon?: Slot;
	/** Click handler. */
	click?: (e: Event) => void;
	/**
	 * Render as a link (`<a>`) pointing here. Pairs naturally with
	 * `interceptLinks()` — the item is highlighted automatically when the URL
	 * matches.
	 */
	href?: string;
	/** `target` for the link (`_blank`, etc.). Only meaningful with `href`. */
	target?: string;
	/** Disables the item. */
	disabled?: boolean;
	/** Aberdeen attr/style string on the item element. */
	attrs?: Attributes;
}

/** A visual divider between groups of items. */
export interface MenuSeparator {
	separator: true;
}

/**
 * An entry in a menu or sidebar nav list. Three forms:
 * - `MenuItem` — a clickable/linkable row with label and optional icon.
 * - `MenuSeparator` — a visual divider (`{ separator: true }`).
 * - A slot (string or draw function) — renders custom content (section header,
 *   avatar, search box, …). Skipped by keyboard navigation.
 */
export type MenuEntry = MenuItem | MenuSeparator | Slot;

/** Options for {@link menuButton} and {@link MainOptions.nav}. */
export interface MenuOptions {
	/** Items shown in the dropdown or sidebar nav. */
	items: MenuEntry[];
	/**
	 * Customize the trigger button rendered by {@link menuButton}. Defaults to a
	 * `☰` icon button. The `click` handler is managed internally.
	 *
	 * When used as a `nav` in `S.main()`, this also customizes the hamburger
	 * button shown when the sidebar collapses.
	 */
	button?: ButtonOptions;
	/** Aberdeen attr/style string on the floating dropdown panel. */
	dropdownAttrs?: Attributes;
}

/** Options for {@link showFloatingMenu}. */
export interface FloatingMenuOptions {
	/** Items to show. */
	items: MenuEntry[];
	/** Element to anchor the menu to (positioned just below it, flips up if needed). */
	anchor: HTMLElement;
	/** Aberdeen attr/style string on the floating panel. */
	dropdownAttrs?: Attributes;
}

// Styles shared by the floating dropdown and the sidebar nav, so both look
// identical. The item styles aren't scoped to a container, so `drawMenu` can
// render its items into either one.
A.insertGlobalCss({
	".s-menu-list":
		"position:fixed z-index:350 min-width:10rem display:flex flex-direction:column p:$1 " +
		"border: 1px solid $s-border; r:$s-radius-lg box-shadow:$s-shadow " +
		"overflow-y:auto max-height:min(80vh,28rem) " +
		"transition: opacity 0.15s, transform 0.15s;",
	".s-menu-list.hidden": "opacity:0 pointer-events:none transform:translateY(-6px)",
	".s-menu-item, .s-menu-item-link":
		"display:flex align-items:center gap:$2 w:100% " +
		"padding: 0.5em 0.65em; r:$s-radius cursor:pointer text-align:left " +
		"font-size:0.9em border:0 background:transparent fg:$s-fg text-decoration:none " +
		"transition: background 0.12s, color 0.12s, transform 0.12s, box-shadow 0.12s;",
	// A translucent ink tint (rather than an *opaque* mix) so the hover fades in
	// cleanly: transitioning background from `transparent` toward an opaque colour
	// flashes through dark mid-tones in browsers that interpolate non-premultiplied.
	// Staying ink-hued at low alpha keeps the fade the right colour throughout.
	".s-menu-item:hover:not([aria-disabled=true]):not([aria-current=page]), .s-menu-item-link:hover:not([aria-current=page])":
		"background: color-mix(in srgb, $s-fg 10%, transparent);",
	// Active (current page): a filled brand-gradient pill with a soft glow — the
	// one place the menu shows real colour, so the current page is unmistakable.
	".s-menu-item[aria-current=page], .s-menu-item-link[aria-current=page]":
		"color:$s-on-accent font-weight:600 background: $s-gradient; box-shadow: 0 3px 10px color-mix(in srgb, $s-primary 38%, transparent);",
	".s-menu-item[aria-current=page] .s-menu-icon, .s-menu-item-link[aria-current=page] .s-menu-icon":
		"color:$s-on-accent",
	".s-menu-item[aria-current=page]:hover, .s-menu-item-link[aria-current=page]:hover":
		"filter:brightness(1.06)",
	".s-menu-item:focus-visible, .s-menu-item-link:focus-visible":
		"outline:none background: color-mix(in srgb, $s-fg 10%, transparent); box-shadow: 0 0 0 2px inset $s-focus;",
	".s-menu-item[aria-disabled=true], .s-menu-item-link[aria-disabled=true]":
		"opacity:0.45 cursor:not-allowed pointer-events:none",
	".s-menu-icon": "fg:$s-fg-muted flex-shrink:0",
	// A soft hairline that fades out at both ends, rather than a hard full-width
	// rule — quieter, and it reads as a grouping cue instead of a divider bar.
	// `hr.` (not just `.`) so this wins over the global hr flow-margin rule.
	"hr.s-menu-sep":
		"border:0 height:1px margin: $1 0.6rem; " +
		"background: linear-gradient(to right, transparent, $s-border-strong 18%, $s-border-strong 82%, transparent);",
});

/**
 * Draw a list of {@link MenuEntry} items into the *current* element, with
 * arrow-key / Home / End navigation between the focusable items. The single
 * shared primitive behind both the floating dropdown ({@link showFloatingMenu})
 * and the sidebar nav in `S.main()` — call it inside whatever container
 * (`<nav>`, the floating panel, …) you've opened.
 *
 * Items are real `<a>`/`<button>` elements, so Enter/Space activate them and
 * screen readers narrate them natively.
 *
 * @param items The entries to render.
 * @param onActivate Optional — run when any item is activated (used by the
 *   floating menu to close itself on selection).
 */
export function drawMenu(items: MenuEntry[], onActivate?: () => void): void {
	// Roving focus via the DOM: query the live item elements on each keypress.
	A("keydown=", (e: KeyboardEvent) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
		e.preventDefault();
		const container = e.currentTarget as HTMLElement;
		const els = [...container.querySelectorAll<HTMLElement>(".s-menu-item, .s-menu-item-link")]
			.filter((el) => el.getAttribute("aria-disabled") !== "true");
		if (!els.length) return;
		const cur = els.indexOf(document.activeElement as HTMLElement);
		const dir = e.key === "ArrowUp" ? -1 : 1;
		const next =
			e.key === "Home" ? 0 :
			e.key === "End" ? els.length - 1 :
			cur < 0 ? (dir > 0 ? 0 : els.length - 1) :
			(cur + dir + els.length) % els.length;
		els[next].focus();
	});

	for (const entry of items) {
		if (typeof entry === "string" || typeof entry === "function") { drawSlot(entry); continue; }
		if ("separator" in entry) { A("hr.s-menu-sep"); continue; }

		A(entry.href ? "a.s-menu-item-link" : "button.s-menu-item type=button", entry.attrs, () => {
			if (entry.href) {
				A("href=", entry.href);
				if (entry.target) A("target=", entry.target);
				A(() => { if (matchCurrent(entry.href!)) A("aria-current=page"); });
			}
			if (entry.disabled) A("aria-disabled=true");
			A("click=", (e: Event) => {
				if (entry.disabled) { e.preventDefault(); return; }
				onActivate?.();
				entry.click?.(e);
			});
			if (entry.icon) A("span.s-menu-icon", () => drawSlot(entry.icon));
			drawSlot(entry.label);
		});
	}
}

// ─── Floating menu ───────────────────────────────────────────────────────────

// At most one floating menu is open at a time. The anchor lives in the options,
// so it's available for positioning and focus-return without extra state.
const $floating = A.proxy<{ opts: FloatingMenuOptions | null }>({ opts: null });

function closeFloating(): void {
	const anchor = $floating.opts?.anchor;
	$floating.opts = null;
	anchor?.focus();
}

function positionMenu(menuEl: HTMLElement, rect: DOMRect): void {
	const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
	const vw = window.innerWidth,  vh = window.innerHeight;
	const gap = 4;
	let x = rect.left;
	if (x + mw > vw - 8) x = Math.max(8, rect.right - mw);
	let y = rect.bottom + gap;
	if (y + mh > vh - 8 && rect.top - mh - gap >= 8) y = rect.top - mh - gap;
	menuEl.style.left = Math.max(8, x) + "px";
	menuEl.style.top  = Math.max(8, y) + "px";
}

mountPortal(() => {
	const f = $floating.opts;
	if (!f) return;

	const menuEl = A("div.s-menu-list.s-s.panel create=hidden destroy=hidden", f.dropdownAttrs, () => {
		drawMenu(f.items, closeFloating);
	}) as HTMLElement;

	// Capture-phase document handlers replace an invisible backdrop element:
	// any click outside the panel + anchor closes; Escape/Tab close.
	const onClick = (e: MouseEvent) => {
		const t = e.target as Node;
		if (!menuEl.contains(t) && !f.anchor.contains(t)) closeFloating();
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); closeFloating(); }
	};
	document.addEventListener("click", onClick, true);
	document.addEventListener("keydown", onKey, true);
	A.clean(() => {
		document.removeEventListener("click", onClick, true);
		document.removeEventListener("keydown", onKey, true);
	});

	// Position after layout, then focus the first enabled item.
	requestAnimationFrame(() => {
		if (!document.body.contains(menuEl)) return;
		positionMenu(menuEl, f.anchor.getBoundingClientRect());
		menuEl.querySelector<HTMLElement>(
			".s-menu-item:not([aria-disabled=true]), .s-menu-item-link:not([aria-disabled=true])",
		)?.focus();
	});
});

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Open a floating dropdown menu anchored to an element. Portals to
 * `document.body` (never clipped), positions itself (flipping up when there's
 * no room below), and closes on Escape, Tab, item selection, or any click
 * outside the panel and anchor. Returns a `close()` function.
 *
 * @example
 * ```ts
 * // Custom context menu:
 * el.addEventListener("contextmenu", (e) => {
 *   e.preventDefault();
 *   S.showFloatingMenu({ items, anchor: el });
 * });
 * ```
 */
export function showFloatingMenu(opts: FloatingMenuOptions): () => void {
	$floating.opts = opts;
	return closeFloating;
}

/**
 * A button that opens a {@link showFloatingMenu | floating dropdown menu} on
 * click. Keyboard navigation: Arrow Up/Down, Home, End; Escape/Tab to close;
 * Enter/Space activate the focused item natively.
 *
 * **Tip:** set `href` on items and call `interceptLinks()` once at app startup
 * for SPA navigation — active items are highlighted automatically.
 *
 * @example
 * ```ts
 * S.menuButton({
 *   button: { content: "Actions", attrs: ".neutral .outlined" },
 *   items: [
 *     { label: "Edit", icon: () => A("#✎"), click: () => edit() },
 *     { separator: true },
 *     { label: "Delete", attrs: "fg:$s-danger", click: () => del() },
 *   ],
 * });
 * ```
 */
export function menuButton(opts: MenuOptions): void {
	let myEl: HTMLElement | null = null;
	A.clean(() => { if ($floating.opts?.anchor === myEl) closeFloating(); });

	button({
		icon: () => A("span aria-hidden=true #☰"),
		// Only label the trigger "Open menu" when it has no visible text of its
		// own — an aria-label would otherwise *hide* that text from AT.
		...(opts.button?.content == null ? { ariaLabel: "Open menu" } : null),
		attrs: ".neutral .outlined",
		...opts.button,
		click: (e: Event) => {
			myEl = e.currentTarget as HTMLElement;
			// Toggle: a second click on the same trigger closes the menu.
			if ($floating.opts?.anchor === myEl) { closeFloating(); return; }
			showFloatingMenu({ items: opts.items, anchor: myEl, dropdownAttrs: opts.dropdownAttrs });
		},
	});
}

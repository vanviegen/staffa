import A from "aberdeen";
import { matchCurrent, current as currentRoute, go } from "aberdeen/route";
import { cssZoom, type Slot, type Attributes, drawSlot, mountPortal, focusFirst } from "../core.js";
import { menu as menuIcon, chevronRight, externalLink as newTabIcon, link as linkIcon } from "../icons.js";
import { button, type ButtonOptions } from "./button.js";
import { toast } from "./toast.js";

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
	 * matches, and scrolled into view if its list had scrolled it out.
	 *
	 * Under routed `S.main()` the link carries `data-panel=open`: a menu row
	 * leads elsewhere in the app, so its target arrives with its own stack of
	 * columns rather than on top of whatever panel the menu was drawn in. Pass
	 * `attrs: "data-panel=push"` for a row that should stack instead.
	 */
	href?: string;
	/**
	 * Pages this item claims *beyond* its own `href`: a string claims that path
	 * and everything under it (`"/mail"` claims `/mail/…`, not `/mailbox`), a
	 * function is asked with the current path. While a claimed page is current,
	 * the item is highlighted and the branches above it stay unfolded — for the
	 * detail screens a menu has no row of their own: the `/thread/[id]` a
	 * notification lands on, an icon's page under the gallery's row. Claims
	 * work from the very first paint, so they also cover cold deep links,
	 * which no amount of fold-state keeping can.
	 */
	match?: string | ((path: string) => boolean);
	/** `target` for the link (`_blank`, etc.). Only meaningful with `href`. */
	target?: string;
	/** Disables the item. */
	disabled?: boolean;
	/** Aberdeen attr/style string on the item element. */
	attrs?: Attributes;
	/**
	 * Child entries, which turn the item into a collapsible **branch** of a
	 * tree. Only the branch holding the current page is expanded; navigate to
	 * another page in the menu and it folds back up. (Navigating to a page the
	 * menu doesn't hold *anywhere* leaves every fold as it was: there is no
	 * better answer to fold up to.) Clicking a branch *selects* rather than
	 * toggles: it follows the item's own `href`, or failing that the first
	 * linked leaf below it — which is what expands it. A branch with no link
	 * anywhere below it falls back to plain open/close toggling.
	 *
	 * Expanding is not selecting: a branch click never counts as picking an
	 * item (see `onLeafSelect` on {@link menu}), so on a phone the nav stays up
	 * while a section unfolds.
	 */
	items?: MenuEntry[];
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
	 * When used as a `nav` in `S.main()`, this also customizes the ☰ the sidebar
	 * collapses into — which is an {@link iconButton}, so only `icon`,
	 * `ariaLabel` and `attrs` apply there.
	 */
	button?: ButtonOptions;
	/** Aberdeen attr/style string on the floating dropdown panel. */
	dropdownAttrs?: Attributes;
}

/** Options for {@link menu}. */
export interface MenuListOptions {
	/**
	 * The entries: items, separators, custom slots — and collapsible branches,
	 * via {@link MenuItem.items}.
	 */
	items: MenuEntry[];
	/**
	 * Run when a **leaf** item is activated. A branch expanding is not a
	 * selection, so it doesn't run this — which is what lets a menu that
	 * dismisses itself on selection stay up while a section unfolds.
	 */
	onLeafSelect?: () => void;
	/** Aberdeen attr/style string on the list element. */
	attrs?: Attributes;
}

/** Options for {@link showFloatingMenu}. */
export interface FloatingMenuOptions {
	/** Items to show. */
	items: MenuEntry[];
	/** Element to anchor the menu to (positioned just below it, flips up if needed). */
	anchor: HTMLElement;
	/**
	 * Position the menu at this viewport point (e.g. a pointer location) instead
	 * of just below the anchor. Used by {@link addContextMenu} to open at the
	 * exact click/tap target.
	 */
	at?: { x: number; y: number };
	/**
	 * Also close the menu when the anchor itself is clicked. By default a click on
	 * the anchor is ignored (so a trigger button can run its own toggle), but a
	 * context menu — whose anchor has no click handler — wants the click to close.
	 */
	closeOnAnchorClick?: boolean;
	/**
	 * The link this menu stands on, as a path or URL. A menu that takes over a
	 * link's right-click takes the browser's own link menu away, so it owes the
	 * two entries anyone actually reaches for there: with this set, **Open in
	 * new tab** and **Copy link** are prepended above a separator, where that
	 * menu would have had them. The shell's breadcrumbs use it.
	 */
	link?: string;
	/** Aberdeen attr/style string on the floating panel. */
	dropdownAttrs?: Attributes;
}

/** Options for {@link addContextMenu} — like {@link FloatingMenuOptions}, but
 * the anchor is the element the handler is attached to. */
export type ContextMenuOptions = Omit<FloatingMenuOptions, "anchor" | "at" | "closeOnAnchorClick">;

// Styles shared by the floating dropdown and the sidebar nav, so both look
// identical. The item styles aren't scoped to a container, so `drawMenu` can
// render its items into either one.
A.insertGlobalCss({
	// Border comes from the `.s-s.neutral` surface; the panel only overrides the radius
	// (lg) and opts into elevation via `.shadow` (added on the element below).
	// `visibility` rides the same transition as the fade (flipping only at its
	// end, per CSS visibility interpolation): a dismissed menu lingers in the
	// DOM for a while — Aberdeen's `destroy=` removes it on a timer, not at
	// the transition's end — and without this it would spend that time
	// invisible yet still hittable by tests and read by assistive tech.
	".s-menu-list":
		"position:fixed z-index:350 min-width:10rem display:flex flex-direction:column p:$1 " +
		"r:$s-radius-lg " +
		"overflow-y:auto max-height:min(calc(80vh/var(--s-zoom,1)),28rem) " +
		"transition: opacity 0.15s, transform 0.15s, visibility 0.15s;",
	".s-menu-list.hidden": "opacity:0 pointer-events:none transform:translateY(-6px) visibility:hidden",
	// One class for both the `<a>` (link) and `<button>` forms — they look
	// identical; the element only differs where link semantics matter (see below).
	// The scroll-margin keeps a revealed row (see the scrollIntoView in
	// `drawMenu`) a little clear of the scrollport edge, instead of flush to it.
	".s-menu-item":
		"display:flex align-items:center gap:$2 w:100% outline:0 scroll-margin:$2 " +
		"padding: $m2 0; line-height:1.1 r:$s-radius cursor:pointer text-align:left font-weight:450 " +
		"font-size:0.9em border:0 background:transparent fg:$s-text text-decoration:none " +
		"transition: color 0.12s, transform 0.12s, text-shadow 0.12s;",
	".s-menu-item:focus-visible:not([aria-current=page]), .s-menu-item:hover:not([aria-disabled=true]):not([aria-current=page])":
		"filter:none color: color-mix(in lab, $s-primary 33%, $s-text);",
	// The active row is simply drawn in the surface's accent — the brand colour on a
	// neutral surface, the ink on an accent one. No glow and no brightening: those
	// pushed it off the brand colour, so it read as a lit-up variant of it rather
	// than as the colour itself. `filter:none` keeps the global `a:hover` brighten
	// off it too, since the hover rule above deliberately skips the active row.
	".s-menu-item[aria-current=page]": "color:$s-accent filter:none",
	// Inside a floating dropdown the rows carry their own horizontal padding:
	// the panel's thin `$1` inset alone leaves labels nearly touching its edge.
	// (Sidebar rows stay flush — their panel brings the breathing room.)
	".s-menu-list .s-menu-item": "padding-inline:$2",
	".s-menu-item[aria-disabled=true]":
		"opacity:0.45 cursor:not-allowed pointer-events:none",
	".s-menu-icon": "flex-shrink:0",
	// A floating menu sizes its glyphs, as `.s-btn` and `.s-icon-btn` do (see
	// button.ts): icons come out of the set at 24px, which towers over a 0.9em
	// dropdown row. Riding the font size keeps it in step with the label.
	// Scoped to `.s-menu-list` deliberately: `S.main`'s nav is a roomier thing
	// than a dropdown — its rows are built around the icon at the size it was
	// drawn, and shrinking it there tightened the whole sidebar.
	".s-menu-list .s-menu-icon": "display:flex",
	".s-menu-list .s-menu-icon > svg": "width:1.25em height:1.25em",
	// A soft hairline that fades out at both ends, rather than a hard full-width
	// rule — quieter, and it reads as a grouping cue instead of a divider bar.
	// `hr.` (not just `.`) so this wins over the global hr flow-margin rule.
	"hr.s-menu-sep":
		"border:0 height:1px margin: $1 0.6rem; " +
		"background: linear-gradient(to right, transparent, $s-faint 18%, $s-faint 82%, transparent);",
	// A branch row's fold indicator: a › that turns downward while the branch is
	// open. It rides the row's font size, like the leading icons do.
	".s-menu-chevron": "margin-left:auto flex-shrink:0 display:flex transition: transform 0.15s ease;",
	".s-menu-chevron > svg": "width:1em height:1em",
	// A branch is a native <details>: closed content is *hidden*, not unmounted,
	// so folding is one attribute flip — no teardown, no sibling redraws — and
	// the browser animates the height natively via `::details-content` (with
	// `interpolate-size`; engines without it simply snap, which is fine).
	".s-menu-details": {
		"> summary": "list-style:none",
		"> summary::-webkit-details-marker": "display:none",
		"&::details-content":
			"interpolate-size:allow-keywords block-size:0 overflow-y:clip " +
			"transition: block-size 0.15s ease, content-visibility 0.15s allow-discrete;",
		"&[open]::details-content": "block-size:auto",
		"&[open] > summary .s-menu-chevron": "transform:rotate(90deg)",
	},
	// A branch's children: indented one step.
	".s-menu-sub": "display:flex flex-direction:column gap:$1 padding-left:$3",
	// The standalone `menu()` component's list. The rows style themselves (they
	// are `.s-menu-item`s like everywhere else); this only stacks them.
	".s-menu-inline": "display:flex flex-direction:column gap:$1",
});

/**
 * Draw a list of {@link MenuEntry} items into the *current* element, with
 * arrow-key / Home / End navigation between the focusable items. The single
 * shared primitive behind the floating dropdown ({@link showFloatingMenu}),
 * the sidebar nav in `S.main()`, and the standalone {@link menu} component —
 * call it inside whatever container (`<nav>`, the floating panel, …) you've
 * opened.
 *
 * Items are real `<a>`/`<button>` elements, so Enter/Space activate them and
 * screen readers narrate them natively. An item with `items` of its own is a
 * collapsible branch — see {@link MenuItem.items}.
 *
 * @param items The entries to render.
 * @param onLeafSelect Optional — run when a *leaf* item is activated (used by
 *   the floating menu to close itself on selection). A branch expanding is
 *   not a selection, so it doesn't run this.
 */
export function drawMenu(items: MenuEntry[], onLeafSelect?: () => void): void {
	// Roving focus via the DOM: query the live item elements on each keypress.
	A("keydown=", (e: KeyboardEvent) => {
		// Link items navigate through interceptLinks' own Enter handler, which
		// preventDefault()s the activation — so no synthetic `click` fires, and the
		// click-bound `onLeafSelect` (which closes a floating menu) never runs. Close it
		// ourselves, deferred so this keydown finishes dispatching (and navigates) first.
		if (e.key === "Enter" && (e.target as HTMLElement).tagName === "A") {
			queueMicrotask(() => onLeafSelect?.());
			return;
		}
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
		e.preventDefault();
		const container = e.currentTarget as HTMLElement;
		const els = [...container.querySelectorAll<HTMLElement>(".s-menu-item")]
			.filter((el) => el.getAttribute("aria-disabled") !== "true" && !foldedAway(el));
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

	// Whether the current page is in this menu *at all*, shared by every branch
	// below: a navigation to a page the menu doesn't hold must leave the folds
	// alone (see `drawBranch`), and that is a fact about the whole menu, which
	// no branch can tell on its own. Derived, so the branches re-run only when
	// the answer flips — not on every navigation between two held pages.
	const $menuHasCurrent = A.derive(() => anyCurrent(items));
	drawEntries(items, onLeafSelect, $menuHasCurrent);
}

function drawEntries(items: MenuEntry[], onLeafSelect?: () => void, $menuHasCurrent?: { value: boolean }): void {
	for (const entry of items) {
		if (typeof entry === "string" || typeof entry === "function") { drawSlot(entry); continue; }
		if ("separator" in entry) { A("hr.s-menu-sep"); continue; }
		if (entry.items) drawBranch(entry, onLeafSelect, $menuHasCurrent);
		else drawLeaf(entry, onLeafSelect);
	}
}

function drawLeaf(entry: MenuItem, onLeafSelect?: () => void): void {
	// Whether the aria-current scope below has run before: it re-runs on
	// every navigation, and only a *later* one should animate the reveal.
	let drawn = false;
	// `data-panel=open` because a menu row is navigation, not a link in the
	// content: it leads somewhere else in the app, and the panel it was clicked
	// from isn't the context to keep. A floating dropdown (portalled to the
	// body) and `S.main()`'s sidebar are outside every panel and behave this way
	// already; saying it outright makes an inline `menu()` — which may well sit
	// *inside* a panel — behave the same wherever it's drawn. `attrs` comes
	// after, so an item that really does want to stack can say
	// `attrs: "data-panel=push"`.
	const itemEl = A(entry.href ? "a.s-menu-item data-panel=open" : "button.s-menu-item type=button", entry.attrs, () => {
		if (entry.href) {
			A("href=", entry.href);
			if (entry.target) A("target=", entry.target);
			A(() => {
				const first = !drawn;
				drawn = true;
				if (!isCurrent(entry)) return;
				A("aria-current=page");
				// A list taller than its scrollport (a long sidebar nav, mostly)
				// highlights nothing when the current row is scrolled out of it,
				// so bring the row into view — no further than needed, and not
				// at all when it's already visible. A row that *starts out*
				// current arrives at the right place (a cold deep link lands
				// with the sidebar already there); when a navigation moves the
				// highlight later, the scroll follows it smoothly. rAF, so a
				// fresh row is laid out before it's measured.
				requestAnimationFrame(() =>
					(itemEl as HTMLElement).scrollIntoView({ block: "nearest", behavior: first ? "instant" : "smooth" }));
			});
		}
		if (entry.disabled) A("aria-disabled=true");
		A("click=", (e: Event) => {
			if (entry.disabled) { e.preventDefault(); return; }
			onLeafSelect?.();
			entry.click?.(e);
		});
		if (entry.icon) A("span.s-menu-icon", () => drawSlot(entry.icon));
		drawSlot(entry.label);
	});
}

/**
 * The last route-derived fold state of every linked branch, keyed by the
 * branch's selection href. Module-level on purpose: the phone's full-page nav
 * (and any dropdown) mounts a fresh menu every time it opens, and per-mount
 * state would hand it three folded sections in the middle of the user's work.
 * Bounded by the number of distinct branch hrefs an app ever shows.
 */
const foldMemory = new Map<string, boolean>();

function setFold(href: string, open: boolean): boolean {
	foldMemory.set(href, open);
	return open;
}

/**
 * A branch: a native `<details>` folding a sub-list of entries in and out. The
 * children stay mounted whether folded or not — closing hides them, it doesn't
 * tear them down — so a fold is a single `open` flip that the browser animates
 * itself, and nothing around it redraws.
 *
 * Clicking the summary row *selects* rather than toggles when there is a page
 * to select (the branch's own `href`, or the first linked leaf below it): it
 * navigates there, and the navigation is what unfolds the branch, since a
 * linked branch is open exactly while it holds the current page. Only a branch
 * with no link anywhere below it keeps the native open/close toggle.
 */
function drawBranch(entry: MenuItem, onLeafSelect?: () => void, $menuHasCurrent?: { value: boolean }): void {
	const href = entry.href ?? firstLeafHref(entry.items!);
	// The route-derived fold state, as a derived boolean so the attribute scope
	// below re-runs only when the answer flips — not on every navigation that
	// merely moves *between* pages inside the branch. When the current page is
	// nowhere in the menu, nothing has an opinion, and the fold simply keeps
	// its last state — folding everything up would answer a question nobody
	// asked with a menu that forgot where the user was.
	//
	// "Last state" lives in `foldMemory`, not in this closure: menus remount —
	// the phone's full-page nav exists only while it is open — and a remount
	// must find the state where the previous mount left it. It is keyed on the
	// branch's selection href, so the sidebar and the phone nav (two renderings
	// of the same items) share one truth, however often either is rebuilt.
	const $open = href != null
		? A.derive(() => {
			if (containsCurrent(entry)) return setFold(href, true);
			if ($menuHasCurrent == null || $menuHasCurrent.value) return setFold(href, false);
			return foldMemory.get(href) ?? false;
		})
		: null;

	A("details.s-menu-details", () => {
		// For a no-link branch this scope has no subscriptions and never re-runs,
		// which is exactly what leaves the native toggle alone.
		if ($open) A(() => { if ($open.value) A("open=true"); });

		A("summary.s-menu-item.s-menu-branch", entry.attrs, () => {
			if (entry.disabled) A("aria-disabled=true");
			A(() => {
				// Current only on its *own* page (its `href`, or a `match` claim —
				// pages with no row of their own): when a descendant is current, that
				// row carries the highlight, and two highlights would read as two pages.
				if (isCurrent(entry)) A("aria-current=page");
			});
			A("click=", (e: Event) => {
				if (entry.disabled) { e.preventDefault(); return; }
				if (href != null) {
					// Selecting, not toggling — suppress the native toggle and
					// navigate; deriving `open` from the URL does the unfolding.
					e.preventDefault();
					noteBranchNav(href);
					void go(href);
				}
				entry.click?.(e);
			});
			if (entry.icon) A("span.s-menu-icon", () => drawSlot(entry.icon));
			drawSlot(entry.label);
			A("span.s-menu-chevron aria-hidden=true", () => chevronRight());
		});

		A("div.s-menu-sub", () => drawEntries(entry.items!, onLeafSelect, $menuHasCurrent));
	});
}

/**
 * Whether a row sits inside a closed branch. A closed `<details>` hides its
 * content without unmounting it, so arrow-key navigation has to skip what the
 * user can't see — while the closed branch's own summary row stays reachable.
 */
function foldedAway(el: HTMLElement): boolean {
	for (
		let details = el.closest("details");
		details;
		details = details.parentElement && details.parentElement.closest("details")
	) {
		if (!(details as HTMLDetailsElement).open && el.closest("summary")?.parentElement !== details) return true;
	}
	return false;
}

/**
 * Whether any item anywhere in `items` — branches, their leaves, `match`
 * claims — is the current page. The one question both the fold logic and the
 * shell's tagline rule (see `taglineFits` in main.ts) ask of a menu, exported
 * so the two can never disagree with the highlighting.
 */
export function anyCurrent(items: MenuEntry[]): boolean {
	return items.some((entry) =>
		typeof entry !== "string" && typeof entry !== "function" && !("separator" in entry) && containsCurrent(entry));
}

/**
 * Whether this item is the current page: its own `href` matches, or its
 * `match` claims the current path. The single test behind `aria-current`,
 * branch unfolding, and {@link anyCurrent} — one truth, three consumers.
 */
function isCurrent(entry: MenuItem): boolean {
	if (entry.href != null && matchCurrent(entry.href)) return true;
	const m = entry.match;
	if (m == null) return false;
	const path = currentRoute.path;
	if (typeof m === "function") return m(path);
	const claim = m.replace(/\/+$/, "") || "/";
	return path === claim || path.startsWith(claim === "/" ? "/" : claim + "/");
}

/** Whether `entry` is the current page itself, or holds it anywhere below. */
function containsCurrent(entry: MenuItem): boolean {
	if (isCurrent(entry)) return true;
	for (const child of entry.items ?? []) {
		if (typeof child === "string" || typeof child === "function" || "separator" in child) continue;
		if (containsCurrent(child)) return true;
	}
	return false;
}

/** The first `href` below `items`, depth-first — what clicking a branch selects. */
function firstLeafHref(items: MenuEntry[]): string | undefined {
	for (const entry of items) {
		if (typeof entry === "string" || typeof entry === "function" || "separator" in entry) continue;
		const href = entry.href ?? (entry.items ? firstLeafHref(entry.items) : undefined);
		if (href != null) return href;
	}
	return undefined;
}

// ─── Branch navigations ──────────────────────────────────────────────────────
// The floating menu and `S.main()`'s collapsed nav dismiss themselves when the
// page navigates — but a branch row navigates *in order to expand*, and
// dismissing over that would close the menu the user is in the middle of
// opening up. So a branch click leaves a note of where it is headed, and the
// dismiss-on-navigation checks consume it.

let branchNavPath: string | null = null;

function noteBranchNav(href: string): void {
	try {
		branchNavPath = new URL(href, location.href).pathname.replace(/\/+$/, "") || "/";
	} catch {
		branchNavPath = null;
	}
}

/**
 * Whether the navigation that just landed on `path` was a branch row expanding
 * (consuming the note it left). Internal — used by the floating menu below and
 * by `S.main()`'s collapsed nav.
 */
export function consumeBranchNav(path: string): boolean {
	if (branchNavPath !== path) return false;
	branchNavPath = null;
	return true;
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

/**
 * Whether a floating menu is currently open. Reflects live state (cleared the
 * instant it closes), unlike the DOM — the panel lingers briefly while its
 * `destroy=` transition plays out.
 *
 * @param anchor When given, only reports `true` for a menu opened from *this*
 *   anchor — so a component can ask about its own menu rather than any menu.
 */
export function isFloatingMenuOpen(anchor?: HTMLElement): boolean {
	const opts = $floating.opts;
	return opts != null && (anchor == null || opts.anchor === anchor);
}

/**
 * Close the open floating menu (if any), returning focus to its anchor. With an
 * `anchor`, only closes when the open menu belongs to it, so dismissing your own
 * menu can't steal someone else's.
 */
export function closeFloatingMenu(anchor?: HTMLElement): void {
	if (isFloatingMenuOpen(anchor)) closeFloating();
}

function positionMenu(menuEl: HTMLElement, rect: { left: number; right: number; top: number; bottom: number }): void {
	// The rect arrives in window coordinates (an anchor's rect, or a pointer
	// position); the left/top set below live in the menu's own space. The two
	// differ when the shell has zoomed the page (see `watchScale` in main.ts),
	// so everything is brought into the menu's space first.
	const z = cssZoom(menuEl);
	const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
	const vw = window.innerWidth / z, vh = window.innerHeight / z;
	const gap = 4;
	let x = rect.left / z;
	if (x + mw > vw - 8) x = Math.max(8, rect.right / z - mw);
	let y = rect.bottom / z + gap;
	if (y + mh > vh - 8 && rect.top / z - mh - gap >= 8) y = rect.top / z - mh - gap;
	menuEl.style.left = Math.max(8, x) + "px";
	menuEl.style.top  = Math.max(8, y) + "px";
}

/**
 * The standard entries for the link a menu stands on (see
 * {@link FloatingMenuOptions.link}). "Open in new tab" is a real new tab, so
 * the target arrives cold, exactly as the link middle-clicked would.
 */
function linkItems(href: string): MenuEntry[] {
	return [
		{ label: "Open in new tab", icon: newTabIcon, click: () => { window.open(href, "_blank", "noopener"); } },
		{ label: "Copy link", icon: linkIcon, click: () => void copyLink(href) },
	];
}

/**
 * Put the link's address on the clipboard, as the absolute URL someone can
 * paste anywhere — what the browser's own "Copy link" would have given them.
 * Confirmed with a toast, since a silent copy leaves you wondering; `writeText`
 * needs a secure context, so a failure says so rather than lying.
 */
async function copyLink(href: string): Promise<void> {
	const url = new URL(href, location.href).href;
	try {
		await navigator.clipboard.writeText(url);
		toast({ message: "Link copied." });
	} catch {
		toast({ message: "Couldn't copy the link.", type: "danger" });
	}
}

mountPortal(() => {
	const f = $floating.opts;
	if (!f) return;

	const menuEl = A("div.s-menu-list.s-s.neutral.shadow create=hidden destroy=hidden", f.dropdownAttrs, () => {
		// One drawMenu call, not one per section: it owns the container's roving
		// keyboard focus, and two of them would move it twice per keypress.
		drawMenu(f.link != null ? [...linkItems(f.link), { separator: true }, ...f.items] : f.items, closeFloating);
	}) as HTMLElement;

	// Capture-phase document handlers replace an invisible backdrop element:
	// any click outside the panel + anchor closes; Escape/Tab close.
	const onClick = (e: MouseEvent) => {
		const t = e.target as Node;
		if (!menuEl.contains(t) && (f.closeOnAnchorClick || !f.anchor.contains(t))) closeFloating();
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); closeFloating(); }
	};
	// A menu is a transient overlay: whatever navigation it started, it hands over
	// to. Items do that themselves (`closeFloating` is `drawMenu`'s `onLeafSelect`
	// above), but custom slot content — a link in a row the menu knows nothing
	// about — doesn't, and neither does a navigation from anywhere else. A branch
	// row expanding is the one navigation that *isn't* a hand-over.
	const openedAt = A.peek(currentRoute, "path");
	A(() => { if (currentRoute.path !== openedAt && !consumeBranchNav(currentRoute.path)) closeFloating(); });
	document.addEventListener("click", onClick, true);
	document.addEventListener("keydown", onKey, true);
	A.clean(() => {
		document.removeEventListener("click", onClick, true);
		document.removeEventListener("keydown", onKey, true);
	});

	// Position after layout, then focus the first enabled item.
	requestAnimationFrame(() => {
		if (!document.body.contains(menuEl)) return;
		// Position at the supplied point (a zero-size rect) when given — e.g. the
		// pointer location for a context menu — otherwise below the anchor.
		const rect = f.at ? { left: f.at.x, right: f.at.x, top: f.at.y, bottom: f.at.y } : f.anchor.getBoundingClientRect();
		positionMenu(menuEl, rect);
		// Focus the active (current-page) item if there is one — so opening lands
		// where you are — else the first focusable element (covers custom slot
		// content, like a settings dropdown, not just `.s-menu-item`s).
		focusFirst(menuEl, ".s-menu-item[aria-current=page]");
	});
});

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * A menu drawn in place: the same list of rows the floating dropdown and
 * `S.main()`'s sidebar are made of, as a plain component — for a nav of your
 * own, a settings column, a sidebar the shell doesn't draw for you. Items are
 * real links/buttons with arrow-key navigation, `href` items highlight
 * themselves on the current page, and an item with `items` of its own becomes
 * a collapsible branch (see {@link MenuItem.items}): only the branch holding
 * the current page stays unfolded.
 *
 * @example
 * ```ts
 * S.menu({
 *   items: [
 *     { label: "Overview", href: "/docs" },
 *     { label: "Guides", items: [
 *       { label: "Install", href: "/docs/install" },
 *       { label: "Theming", href: "/docs/theming" },
 *     ]},
 *   ],
 * });
 * ```
 */
export function menu(opts: MenuListOptions): void {
	A("nav.s-menu-inline", opts.attrs, () => drawMenu(opts.items, opts.onLeafSelect));
}

/**
 * Open a floating dropdown menu anchored to an element. Portals to
 * `document.body` (never clipped), positions itself (flipping up when there's
 * no room below), and closes on Escape, Tab, item selection, or any click
 * outside the panel and anchor. Returns a `close()` function.
 *
 * Menus are usually opened through {@link menuButton} or
 * {@link addContextMenu}; reach for this primitive when you need to trigger a
 * menu from some other event, anchored to an arbitrary element.
 *
 * @example
 * ```ts
 * // An @-mention picker: typing "@" in the input pops up a user menu.
 * const users = ['Alice', 'Bob', 'Charlie', 'Dutley']
 * A("input placeholder=Comment…", () => {
 *   A("keydown=", (e: KeyboardEvent) => {
 *     if (e.key !== "@") return;
 *     S.showFloatingMenu({
 *       anchor: e.currentTarget as HTMLElement,
 *       items: users.map((u) => ({ label: u, click: () => S.alert(`Mentioned ${u}!`) })),
 *     });
 *   });
 * });
 * ```
 */
export function showFloatingMenu(opts: FloatingMenuOptions): () => void {
	$floating.opts = opts;
	return closeFloating;
}

/**
 * Attaches a context menu to the current element: adds a `contextmenu` handler
 * via {@link A} so a {@link showFloatingMenu | floating menu} opens (instead of
 * the browser's own menu) on right-click or long-press. The menu is anchored to
 * the element and closes on Escape, Tab, item selection, or any click outside.
 *
 * @example
 * ```ts
 * import * as icons from "staffa/icons";
 *
 * S.box(() => {
 *   A("#Right-click / long-tap me!");
 *   S.addContextMenu({
 *     items: [
 *       { label: "AI something", icon: icons.sparkles, click: () => ai() },
 *       { label: "Launch missiles", icon: icons.rocket, click: () => launch() },
 *     ],
 *   });
 * });
 * ```
 */
export function addContextMenu(opts: ContextMenuOptions): void {
	let myEl: HTMLElement | null = null;
	A.clean(() => { if ($floating.opts?.anchor === myEl) closeFloating(); });

	A("contextmenu=", (e: MouseEvent) => {
		e.preventDefault();
		myEl = e.currentTarget as HTMLElement;
		// Anchor at the exact click/tap point, and close on a plain click of the
		// element (it has no toggle handler of its own). The rest of the options
		// pass through whole, so a shared option can't be dropped on the way.
		showFloatingMenu({
			...opts,
			anchor: myEl,
			at: { x: e.clientX, y: e.clientY },
			closeOnAnchorClick: true,
		});
	});
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
 *   button: { content: "Actions", attrs: ".neutral" },
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
		icon: menuIcon,
		// Only label the trigger "Open menu" when it has no visible text of its
		// own — an aria-label would otherwise *hide* that text from AT.
		...(opts.button?.content == null ? { ariaLabel: "Open menu" } : null),
		attrs: ".neutral",
		...opts.button,
		click: (e: Event) => {
			myEl = e.currentTarget as HTMLElement;
			// Toggle: a second click on the same trigger closes the menu.
			if ($floating.opts?.anchor === myEl) { closeFloating(); return; }
			showFloatingMenu({ items: opts.items, anchor: myEl, dropdownAttrs: opts.dropdownAttrs });
		},
	});
}

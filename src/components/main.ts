import A from "aberdeen";
import { type Slot, type Attributes, drawSlot, focusFirst, NARROW_PX } from "../core.js";
import { type MenuOptions, drawMenu, showFloatingMenu, isFloatingMenuOpen, closeFloatingMenu } from "./menu.js";
import { button } from "./button.js";
import { isDialogOpen } from "./dialog.js";
import { PanelController, type Page, type RouteHandler, type RouteTable, type Routes } from "./panels.js";

/** Options for {@link main}. */
export interface MainOptions<R = Routes> {
	/** Aberdeen attr/style string applied to the outermost shell element. */
	attrs?: Attributes;
	/** App/page title shown in the top bar. */
	title?: Slot;
	/** Secondary line under the title. */
	subtitle?: Slot;
	/** Leading icon/logo in the top bar. */
	icon?: Slot;
	/** Action area on the right of the top bar (buttons, menu, ...). */
	menu?: Slot;
	/**
	 * The scrollable page content. A string is rendered as rich text.
	 * Mutually exclusive with {@link MainOptions.routes}.
	 */
	content?: Slot;
	/**
	 * Paths mapped to the functions that draw them, which hands navigation over
	 * to the shell. Each route draws one screen of your app, called a panel, and
	 * as many panels as fit are shown at a time: one at a time on a phone,
	 * several side by side on a wider screen. Mutually exclusive with
	 * {@link MainOptions.content}.
	 *
	 * A segment wrapped in brackets is a param: `[name]` matches one segment as
	 * a string, `[name=integer]` matches one segment as a number, and a trailing
	 * `[...name]` matches the rest of the path as one raw (still percent-encoded)
	 * string, so it has to come last and needs at least one segment to match.
	 * The first key that matches wins, a segment a param refuses falls through
	 * to a later route (or to {@link MainOptions.notFound}), and each handler's
	 * `$page.params` is typed from its own key.
	 *
	 * `integer` accepts only spellings that survive a round trip back to the
	 * same URL, so `/tasks/0042` is not a second path for `/tasks/42`. Ids that
	 * aren't safe integers, such as snowflakes, want a plain `[id]`.
	 *
	 * Navigating is just links: the shell handles the clicks itself, so do *not*
	 * also call Aberdeen's `interceptLinks()`. A link opens its target on top of
	 * the panel it sits in, closing anything that was above it first, unless it
	 * carries `data-panel=replace`, which replaces its own panel instead. A link
	 * to something already open goes back to it rather than opening it twice.
	 * From code, use {@link panels} (`S.panels.push()` and friends): navigating
	 * with `aberdeen/route`'s own `go()` works and still asks the panels'
	 * {@link Page.requestClose}, but builds the whole stack from the path. A
	 * navigation guard the app registered before mounting (an auth redirect,
	 * say) keeps working: the shell asks it first, and puts it back when the
	 * shell goes away.
	 *
	 * The shell draws no back arrows and no ✕ of its own: **every panel provides
	 * its own way out**, with `S.box`'s `close` option for a ✕, or
	 * {@link Page.close} behind a Cancel button. Escape and the browser's back
	 * button are the shell's contribution.
	 *
	 * Only one routed shell can be mounted at a time (a second one throws),
	 * which is what lets {@link panels} be a plain module-level object. Each
	 * handler still gets its own `$page` rather than there being one global
	 * "current page", since several panels are alive at once. It's that argument
	 * that carries the per-route typing of `params`.
	 *
	 * @example
	 * ```ts
	 * S.main({
	 *   title: "Trackle",
	 *   nav: { items: [{ label: "Projects", href: "/projects" }] },
	 *   routes: {
	 *     "/projects": ($page) => { $page.title = "Projects"; drawProjects(); },
	 *     "/projects/[id]": ($page) => drawProject($page.params.id),  // typed string
	 *   },
	 *   notFound: ($page) => S.box({ header: "Not found", content: $page.path }),
	 * });
	 * ```
	 */
	routes?: R;
	/**
	 * Draws the panel for a path none of the routes match. There are no params
	 * to go with it, so `$page.params` is empty; the path itself is in
	 * `$page.path`.
	 */
	notFound?: RouteHandler<{}>;
	/**
	 * Set `false` to show only the top panel, however wide the screen (the nav
	 * sidebar still sits beside it). Everything else behaves the same: the URL,
	 * the back button, `requestClose`, and the panels' own close buttons. This
	 * only changes how many you see. Defaults to `true`.
	 */
	stacking?: boolean;
	/** Footer content, pinned below the scroll area. */
	footer?: Slot;
	/**
	 * Max width for the page's *content*, e.g. `"60rem"`. The header and footer
	 * backgrounds still span the full shell width, but their contents — and the
	 * sidebar + separator + content trio (or just the content when there's no
	 * sidebar) — cap to this width and centre horizontally. When unset, everything
	 * fills the available width. Either way the content shares the page surface —
	 * it is not boxed.
	 *
	 * Ignored when you pass {@link MainOptions.routes}: there the open panels
	 * decide the width (see {@link Page.layout}), and the header and footer line
	 * themselves up with them.
	 */
	maxWidth?: string;
	/** Aberdeen attr/style string applied to the content area. */
	contentAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the top bar. */
	topbarAttrs?: Attributes;
	/**
	 * Navigation menu. When provided, renders a sidebar (in `"left"` / `"right"`
	 * mode) or a button+dropdown (in `"button"` mode). The sidebar automatically
	 * collapses to a button when the shell is too narrow — which there opens the
	 * nav as a full page sliding in from the left, not as a dropdown.
	 */
	nav?: MenuOptions;
	/**
	 * Where to render the nav. Defaults to `"left"`.
	 * - `"left"` / `"right"`: sidebar next to the content area; collapses to a
	 *   button in the top bar when the shell width drops below 640 px.
	 * - `"button"`: always a button, never a sidebar.
	 *
	 * The button opens a dropdown on a wide shell, and — below 640 px — a
	 * full-page nav that slides in from the left, handing over to the chosen
	 * screen with a matching slide in from the right.
	 */
	navPosition?: "left" | "right" | "button";
	/** Aberdeen attr/style string applied to the sidebar nav panel. */
	navAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the narrow-screen full-page nav. */
	navPageAttrs?: Attributes;
}

A.insertGlobalCss({
	".s-main": {
		// container-type so @container queries below can respond to shell width.
		"&": "display:flex flex-direction:column min-height:100vh max-height:100vh container-type:inline-size",
		// <body> carries a default $3 padding; when the shell is a direct child of it,
		// cancel that padding with matching negative margins so the chrome still spans
		// edge to edge (and the 100vh sizing stays exact).
		"body > &": "margin: calc(-1 * $3)",
		// Header/footer stretch their background the full shell width; their inner
		// `.s-bar` caps to maxWidth and centres, so chrome aligns with the content.
		// The top bar is a full-width `.neutral` surface; cancel its surface border and
		// radius down to just the bottom divider (it spans edge to edge).
		"> header": "border:0 border-bottom: 1px solid $s-faint; r:0 position:sticky top:0 z-index:10",
		"> footer": "border-top: 1px solid $s-faint; fg:$s-muted",
		"> header > .s-bar, > footer > .s-bar": "display:flex align-items:center width:100% margin-inline:auto gap:$3 padding: $2 $3;",
		"> header .s-header-icon": "display:flex align-items:center font-size:1.4em background: $s-gradient; -webkit-background-clip:text; background-clip:text; color:transparent;",
		"> header .s-titles": "display:flex flex-direction:column min-width:0 flex:1",
		"> header .s-title": "font-weight:800 font-size:1.1em line-height:1.2 overflow:hidden text-overflow:ellipsis white-space:nowrap letter-spacing:-0.01em background: $s-gradient; -webkit-background-clip:text; background-clip:text; color:transparent; width:fit-content max-width:100%",
		"> header .s-subtitle": "fg:$s-muted font-size:0.85em overflow:hidden text-overflow:ellipsis white-space:nowrap",
		"> header .s-menu": "display:flex align-items:center gap:$2",
		// Body always wraps <main> (with or without a sidebar) so max-width centering
		// and scrollbar alignment work identically in both cases.
		// .s-body centres .s-body-inner; .s-body-inner caps the content to maxWidth.
		// It's also the positioning + clipping context for the narrow-screen nav page,
		// which slides in and out across its left edge.
		".s-body": "flex:1 overflow:hidden display:flex flex-direction:row min-height:0 justify-content:center position:relative",
		".s-body-inner": "flex:1 min-width:0 display:flex flex-direction:row min-height:0",
		// Put the sidebar on the right (content fills the left) for right-hand navs.
		"&.s-nav-right .s-body-inner": "flex-direction:row-reverse",
		// A vertical hairline between sidebar and content, fading out at both ends —
		// the vertical sibling of the menu's `hr.s-menu-sep`.
		".s-nav-sep": "width:1px flex-shrink:0 align-self:stretch margin: 0.6rem 0; border:0 background: linear-gradient(to bottom, transparent, $s-faint 18%, $s-faint 82%, transparent);",
		// min-height:0 / min-width:0 override the flex default of min-*:auto so <main>
		// can shrink to fit the bounded container (rather than letting wide content push
		// the whole body — and any sidebar — past the viewport edge). overflow-x:hidden
		// clips overlong content on the right; vertically it scrolls.
		// The transition is dormant (nothing else moves <main>); it's there for the
		// incoming half of the nav-page hand-off — see `slideContentIn`.
		".s-body main":
			"flex:1 min-width:0 min-height:0 overflow-x:hidden overflow-y:auto display:flex flex-direction:column " +
			"transition: transform 0.3s ease;",
		// A one-shot starting position: parked one screen to the right, with the
		// transition off so it snaps there. Removing the class animates it home.
		".s-body main.s-slide-in": "transform: translateX(100%); transition:none",
		// The content area fills the scroll region with comfortable padding.
		// It is deliberately NOT a boxed "sheet" — content brings its own boxes.
		".s-body main > .s-content": "width:100% flex:1 p:$3",
		// When <main> actually shows a vertical scrollbar (the `.s-scroll-y` class is
		// toggled from JS by watchVerticalOverflow), inset it from the shell edge by
		// $3 so the bar's right edge lines up with the header/footer content (which
		// sits $3 inside the edge via `.s-bar` padding). The $3 gap between the content
		// and the bar already comes from `.s-content`'s padding. Without a scrollbar
		// there's no margin, so the content keeps its single $3 edge — not 2×$3.
		".s-body main.s-scroll-y": "margin-right:$3",
		// Routed mode takes its width from the panel stack instead of from
		// `maxWidth`: the layout engine publishes the ensemble width (sidebar +
		// separator + content area) as --s-shell-w — the standard 1280px page
		// normally, the window's edges while a "large" panel is up — and the body
		// row and the bars cap themselves to it. So the chrome lines up with the
		// columns and the lot stays centred in the shell.
		"&.s-routed > .s-body > .s-body-inner": "max-width: var(--s-shell-w, 100%);",
		"&.s-routed > header > .s-bar": "max-width: var(--s-shell-w, 100%);",
		"&.s-routed > footer > .s-bar": "max-width: var(--s-shell-w, 100%);",
		// Changing the custom property animates the max-widths consuming it, with no
		// JS in the loop: the chrome recentres in step with the panel whose arrival
		// or departure moved it, over the same --s-panel-ms (see panels.ts). During
		// a window resize (and the very first pass) the layout engine raises
		// `.s-shell-snap` so the new width is adopted instantly instead of chasing
		// the window through a transition.
		"&.s-routed > .s-body > .s-body-inner, &.s-routed > header > .s-bar, &.s-routed > footer > .s-bar":
			"transition: max-width var(--s-panel-ms) ease;",
		"&.s-routed.s-shell-snap > .s-body > .s-body-inner, &.s-routed.s-shell-snap > header > .s-bar, &.s-routed.s-shell-snap > footer > .s-bar":
			"transition:none",
	},
	// Sidebar nav panel. Items reuse the shared `.s-menu-item` /
	// `.s-menu-sep` styles from menu.ts, so the sidebar and the floating
	// dropdown stay visually identical.
	// Borderless and transparent so the page's aurora shows through — an airy,
	// floating sidebar whose only chrome is the active item's gradient pill.
	".s-nav-panel": {
		// Extra horizontal padding leaves room for the active pill's glow, which the
		// vertical scroll (overflow-y:auto, which also clips overflow-x) would
		// otherwise cut off at the panel edges.
		"&": "display:flex flex-direction:column overflow-y:auto flex-shrink:0 max-width:228px padding:$3 gap:$1",
	},
	// The narrow-screen nav: a full "page" that slides in over the content from the
	// left, rather than a dropdown — on a phone a nav is a screenful of UI, not a
	// popup. Picking an item slides it back out while the chosen screen comes in
	// from the right (see `slideContentIn`), so the two tile across the viewport
	// and navigation reads as a lateral move between screens.
	".s-nav-page": {
		// It covers the body area only, so the top bar (whose trigger has become an
		// ✕) and the footer stay put — the shell itself never blinks.
		"&":
			// z-index sits under the sticky header's 10: the two never overlap (the
			// body starts below the bar), but the bar should still win if they ever do.
			"position:absolute inset:0 z-index:5 display:flex flex-direction:column " +
			"overflow-y:auto overscroll-behavior:contain border:0 r:0 padding:$2 gap:$1 " +
			"transition: transform 0.3s ease;",
		// Parked one screen to the left: the state the `create=`/`destroy=` hooks
		// transition out of and back into.
		"&.s-nav-page-off": "transform:translateX(-100%) pointer-events:none",
		// Roomier rows than the dropdown's: this is the whole screen, and every row
		// is a thumb target.
		".s-menu-item": "padding: $2 $3; min-height:3rem font-size:1.05em gap:$3",
	},
	// In button-only mode (or always-button navPosition), hide the sidebar and
	// show the trigger. In sidebar mode, show the panel and hide the trigger.
	// CSS @container queries handle the responsive collapse automatically.
	".s-main.s-nav-left .s-nav-trigger, .s-main.s-nav-right .s-nav-trigger": "display:none",
	".s-main.s-nav-btn-only .s-nav-panel": "display:none",
	".s-main.s-nav-btn-only .s-nav-trigger": "display:flex",
	// Collapse sidebar → button when shell is narrow.
	[`@container (max-width: ${NARROW_PX}px)`]: {
		".s-main.s-nav-left .s-nav-panel, .s-main.s-nav-right .s-nav-panel, .s-main .s-nav-sep": "display:none",
		".s-main.s-nav-left .s-nav-trigger, .s-main.s-nav-right .s-nav-trigger": "display:flex",
		// On phones a top-level content box becomes a full-bleed block: pull it out
		// to negate the content padding and drop the rounded corners.
		".s-content > .s-box": "margin-inline: calc(-1 * $3); r:0 border-inline:0",
		// At narrow widths, content boxes are full-bleed so there's no inset to
		// align the scrollbar with — cancel the right margin.
		".s-main .s-body main.s-scroll-y": "margin-right:0",
	},
});

/**
 * An application shell that wires up the things almost every app needs: a sticky
 * top bar (icon, title, subtitle, action menu), a scrollable content area, and a
 * footer. With {@link MainOptions.maxWidth} the content area is centred and its
 * width capped. Add a `nav` to get a responsive sidebar (auto-collapses to a
 * menu button below 640 px, or always a button with `navPosition: "button"`).
 * Below 640 px that button opens the nav as a full page sliding in from the
 * left; picking an item slides it away as the chosen screen enters from the
 * right.
 *
 * Instead of a single `content` slot, pass {@link MainOptions.routes} and the
 * shell takes over navigation: each route draws one screen, called a panel,
 * and as many panels as fit are shown at a time, side by side on a wide screen
 * and one at a time on a phone. See {@link MainOptions.routes} and {@link Page}.
 *
 * @example
 * ```ts
 * S.main({
 *   icon: "✦",
 *   title: "Staffa Demo",
 *   maxWidth: "56rem",
 *   nav: {
 *     items: [
 *       { label: "Home", icon: () => A("#🏠"), href: "/" },
 *       { label: "Settings", href: "/settings" },
 *     ],
 *   },
 *   navPosition: "left",
 *   menu: () => S.button({ content: "New", attrs: ".small" }),
 *   content: drawPage,
 *   footer: "© 2026",
 * });
 * 
 * function drawPage() {
 *   S.box({title: "Hello world", content: "Here's you app.."});
 * }
 * ```
 */
// The self-referential constraint is what types each handler's `$page.params`
// from its own route key. It deliberately has no default: giving `R` one makes
// TypeScript fall back to it for contextual typing, and every `$page.params`
// silently degrades to `any`. Callers that pass no `routes` are unaffected —
// `MainOptions`'s own default kicks in there.
export function main<R extends RouteTable<R>>(opts: MainOptions<R> = {}): void {
	const nav = opts.nav;
	const navPos = opts.navPosition ?? "left";
	const hasNav = nav != null && nav.items.length > 0;
	const navCls = hasNav ? (navPos === "button" ? ".s-nav-btn-only" : `.s-nav-${navPos}`) : "";
	// Whether the narrow-screen full-page nav is showing. Per shell, so nested or
	// sibling `main()`s can't fight over it.
	const $nav = A.proxy({ open: false });

	const routes = opts.routes as Routes | undefined;
	if (routes != null && opts.content != null) {
		throw new Error("Staffa: S.main() takes either `content` or `routes`, not both");
	}
	// The panel stack owns the routing, so it starts observing (and building its
	// stack from) the URL before any of the shell is drawn — the top bar's back
	// button already needs to know how deep we are.
	const ctl = routes ? new PanelController({ ...opts, routes, title: opts.title }) : null;
	// Routed mode caps the shell to the ensemble width the layout engine publishes,
	// rather than to `maxWidth`.
	const capWidth = ctl ? null : opts.maxWidth;

	const root = A(`div.s-main${navCls}${ctl ? ".s-routed" : ""}`, opts.attrs, () => {
		// Top bar.
		A(() => {
			const hasBar =
				opts.title != null ||
				opts.subtitle != null ||
				opts.icon != null ||
				opts.menu != null ||
				hasNav;
			if (!hasBar) return;
			A("header.s-s.neutral", opts.topbarAttrs, () => {
				A("div.s-bar", () => {
					// Cap the bar's content to maxWidth and centre it within the full-width header.
					A(() => {
						if (capWidth != null) A("max-width:", capWidth);
					});
					// Nav trigger button — visible when sidebar is hidden (button mode or narrow viewport).
					A(() => {
						if (!hasNav) return;
						// .s-nav-trigger: CSS toggles display based on sidebar visibility.
						A("div.s-nav-trigger", () => drawNavTrigger(nav, $nav));
					});

					A(() => {
						if (opts.icon != null) A("div.s-header-icon", () => drawSlot(opts.icon));
					});
					A("div.s-titles", () => {
						A(() => {
							if (opts.title != null) A("div.s-title", () => drawSlot(opts.title));
						});
						A(() => {
							if (opts.subtitle != null) A("div.s-subtitle", () => drawSlot(opts.subtitle));
						});
					});
					A(() => {
						if (opts.menu) A("div.s-menu", () => drawSlot(opts.menu));
					});
				});
			});
		});

		// Body always wraps <main> so max-width centering and scrollbar alignment
		// are identical with and without a sidebar nav.
		A("div.s-body", () => {
			A("div.s-body-inner", () => {
				A(() => {
					if (capWidth != null) A("max-width:", capWidth);
				});
				if (hasNav && navPos !== "button") {
					A(`nav.s-nav-panel.s-nav-${navPos}`, opts.navAttrs, () => {
						drawMenu(nav.items);
					});
					A("div.s-nav-sep aria-hidden=true");
				}
				drawMainContent(opts, ctl);
			});
			// The narrow-screen nav page, laid over the body it slides across.
			A(() => {
				if (hasNav && $nav.open) drawNavPage(nav, opts.navPageAttrs, $nav);
			});
		});

		// Footer — full-width background, content centred to maxWidth via .s-bar.
		A(() => {
			if (opts.footer != null) {
				A("footer", () => {
					A("div.s-bar", () => {
						A(() => {
							if (capWidth != null) A("max-width:", capWidth);
						});
						drawSlot(opts.footer);
					});
				});
			}
		});
	}) as HTMLElement;

	// Escape peels back a panel of UI, and finally jumps to the navigation: into
	// the sidebar's current item when the sidebar is showing, or — when collapsed
	// to (or always) a button — open the nav (dropdown or full page, whichever the
	// shell width calls for), which focuses its current item. Listens on
	// `document` so it works wherever focus is, but bows out while another overlay
	// (a dialog, or an already-open menu) is up — those handle Escape themselves.
	if (hasNav || ctl) {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || e.defaultPrevented) return;
			// An open dialog or menu owns Escape itself — don't also jump to the nav.
			if (isDialogOpen() || isFloatingMenuOpen()) return;
			const trigger = root.querySelector<HTMLElement>(".s-nav-trigger button");
			// So does the full-page nav: dismiss it and hand focus back to its trigger.
			if ($nav.open) {
				e.preventDefault();
				$nav.open = false;
				trigger?.focus();
				return;
			}
			// Above the stack root, Escape closes the top panel — the same guarded
			// close as a page's own ✕ or the browser's back button. It is, with
			// browser back, the only way out the shell itself provides.
			if (ctl && ctl.$state.paths.length > 1) {
				e.preventDefault();
				void ctl.closeTop();
				return;
			}
			if (!hasNav) return;
			// `offsetParent` is null when the sidebar is hidden (display:none).
			const panel = root.querySelector<HTMLElement>(".s-nav-panel");
			if (panel?.offsetParent != null) {
				const item =
					panel.querySelector<HTMLElement>("[aria-current=page]") ??
					panel.querySelector<HTMLElement>(".s-menu-item:not([aria-disabled=true])");
				if (item) { e.preventDefault(); item.focus(); }
				return;
			}
			if (trigger) { e.preventDefault(); trigger.click(); }
		};
		document.addEventListener("keydown", onKey);
		A.clean(() => document.removeEventListener("keydown", onKey));
	}
}

/**
 * The hamburger in the top bar, shown whenever the sidebar isn't. What it opens
 * depends on how much room the shell has: a dropdown when there's plenty, and —
 * below {@link NARROW_PX} — the full-page nav, which suits a phone far better
 * than a popup. Either way a second click closes again.
 */
function drawNavTrigger(nav: MenuOptions, $nav: { open: boolean }): void {
	let myEl: HTMLElement | null = null;
	A.clean(() => { if (myEl) closeFloatingMenu(myEl); });

	button({
		// The glyph doubles as the state: ☰ to open the page, ✕ to dismiss it. Its
		// own scope, so toggling doesn't rebuild (and re-focus) the button.
		icon: () => A(() => A("span aria-hidden=true #", $nav.open ? "✕" : "☰")),
		ariaLabel: "Open navigation",
		attrs: ".neutral .small",
		...nav.button,
		click: (e: Event) => {
			myEl = e.currentTarget as HTMLElement;
			const shell = myEl.closest<HTMLElement>(".s-main");
			if (shell != null && shell.clientWidth <= NARROW_PX) { $nav.open = !$nav.open; return; }
			// Wide shell: the classic dropdown. A click on the trigger never reaches
			// the menu's own outside-click handler, so toggle it here.
			if (isFloatingMenuOpen(myEl)) closeFloatingMenu(myEl);
			else showFloatingMenu({ items: nav.items, anchor: myEl, dropdownAttrs: nav.dropdownAttrs });
		},
	});
}

/**
 * The narrow-screen navigation: a full page sliding in over the content from the
 * left. Picking an item slides it back out while the chosen screen enters from
 * the right, so the two tile across the viewport and the whole thing reads as a
 * lateral move rather than a popup blinking out.
 */
function drawNavPage(nav: MenuOptions, attrs: Attributes | undefined, $nav: { open: boolean }): void {
	// Whether this close is a *navigation* — the only kind that hands over to an
	// incoming screen. Dismissing the page just uncovers the content again.
	let navigated = false;

	const pageEl = A(
		"nav.s-nav-page.s-s.neutral aria-label=Navigation create=s-nav-page-off destroy=s-nav-page-off",
		attrs,
		() => drawMenu(nav.items, () => { navigated = true; $nav.open = false; }),
	) as HTMLElement;

	const shell = pageEl.closest<HTMLElement>(".s-main");
	const behind = pageEl.parentElement?.querySelector<HTMLElement>(":scope > .s-body-inner");
	// Content mode's incoming half of the hand-off. In routed mode there is no
	// <main> to slide: the chosen screen is a freshly pushed panel, which plays
	// its own enter animation, so this correctly finds nothing.
	const content = behind?.querySelector<HTMLElement>(":scope > main");

	// The content is fully covered, but without this it stays tabbable and visible
	// to screen readers underneath the page.
	behind?.setAttribute("inert", "");

	// Widening the shell past the collapse point brings the sidebar back, leaving
	// this page covering the content for no reason — so bow out.
	if (shell != null && typeof ResizeObserver !== "undefined") {
		const ro = new ResizeObserver(() => { if (shell.clientWidth > NARROW_PX) $nav.open = false; });
		ro.observe(shell);
		A.clean(() => ro.disconnect());
	}

	A.clean(() => {
		behind?.removeAttribute("inert");
		if (!navigated) return;
		// Same tick as the page's own destroy transition, so both halves of the
		// hand-off move in lockstep.
		if (content) slideContentIn(content);
		shell?.querySelector<HTMLElement>(".s-nav-trigger button")?.focus();
	});

	// Land on the current page's entry (or the first one) once we're laid out.
	requestAnimationFrame(() => {
		if (document.body.contains(pageEl)) focusFirst(pageEl, ".s-menu-item[aria-current=page]");
	});
}

/**
 * Play the incoming half of the nav-page hand-off: park `el` one screen to the
 * right, then let its CSS transition carry it home. Reading `offsetWidth` in
 * between forces the browser to adopt the parked position as the "before" state,
 * which is what makes the removal animate instead of doing nothing at all.
 */
function slideContentIn(el: HTMLElement): void {
	el.classList.add("s-slide-in");
	void el.offsetWidth;
	el.classList.remove("s-slide-in");
}

function drawMainContent(opts: MainOptions<any>, ctl: PanelController | null): void {
	// Routed mode replaces the single scrollable <main> with the panel viewport,
	// which manages its own columns (and their scrolling) from JS.
	if (ctl) {
		ctl.drawStack();
		return;
	}
	const mainEl = A("main", () => {
		A("div.s-content", opts.contentAttrs, () => {
			drawSlot(opts.content);
		});
	}) as HTMLElement;
	watchVerticalOverflow(mainEl);
}

/**
 * Toggle the `.s-scroll-y` class on `el` whenever a vertical scrollbar is eating
 * into its width, so CSS can inset the bar from the shell edge (see the
 * `.s-scroll-y` rule above). We key on `offsetWidth > clientWidth` — a
 * *space-consuming* scrollbar — rather than on content overflow, so overlay
 * scrollbars (mobile, macOS) that take no layout width don't trigger the margin.
 * A `ResizeObserver` watches both the viewport and its content, so the class
 * tracks live content/layout changes; it's disconnected when the scope tears down.
 */
function watchVerticalOverflow(el: HTMLElement): void {
	if (typeof ResizeObserver === "undefined") return; // No-op outside the browser.
	const update = () => el.classList.toggle("s-scroll-y", el.offsetWidth > el.clientWidth);
	const ro = new ResizeObserver(update);
	ro.observe(el);
	if (el.firstElementChild) ro.observe(el.firstElementChild);
	update();
	A.clean(() => ro.disconnect());
}

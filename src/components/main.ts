import A from "aberdeen";
import { current as currentRoute, matchCurrent } from "aberdeen/route";
import { type Slot, type Attributes, drawSlot, focusFirst, NARROW_PX } from "../core.js";
import { type MenuOptions, type MenuEntry, drawMenu, isFloatingMenuOpen, consumeBranchNav } from "./menu.js";
// The shell's own chrome glyphs, from the same Lucide set an app draws with —
// so a nav trigger sits beside app icons as an equal. Named imports, so a
// bundler keeps these two and tree-shakes the other ~1950 away.
import { menu as menuIcon, x as closeIcon } from "../icons.js";
import { iconButton } from "./button.js";
import { isDialogOpen } from "./dialog.js";
import { PanelStackController, type PanelStack, type AncestorTable, type Panel, type RouteHandler, type RouteTable, type Routes } from "./panels.js";

/** Options for {@link main}. */
export interface MainOptions<R = Routes> {
	/** Aberdeen attr/style string applied to the outermost shell element. */
	attrs?: Attributes;
	/**
	 * The app's name, shown in the top bar in the brand's own styling, with the
	 * breadcrumb stack of open panels on the line beneath it (in routed mode).
	 * In routed mode it is a link to the app's {@link MainOptions.home}, as the
	 * {@link MainOptions.logo} is.
	 */
	title?: Slot;
	/**
	 * A tagline for the app, on the line under its name.
	 *
	 * In routed mode that line is the breadcrumb stack's, and the tagline only
	 * gets it while the stack would be saying nothing the screen doesn't
	 * already: exactly one panel open, that panel being one a nav item leads to
	 * (so the sidebar has it highlighted), and the sidebar actually on screen.
	 * Open a panel on top of it, or narrow the shell until the nav is behind the
	 * ☰, and the stack takes the line back — it is then the only thing naming
	 * the screen. Pass no subtitle and the stack simply always has it.
	 *
	 * Outside routed mode nothing competes for the line, so it always shows.
	 */
	subtitle?: Slot;
	/**
	 * The brand mark: the bar's leading slot while the nav is a sidebar.
	 *
	 * A narrow shell *displaces* it with the ☰ that opens the collapsed nav. The
	 * app never branches on which: it hands over a logo and the shell works out
	 * whether there is room for it. In routed mode it is a link to the app's
	 * {@link MainOptions.home}, as the app's name is.
	 */
	logo?: Slot;
	/**
	 * The app's home: where the name and the {@link MainOptions.logo} in the
	 * top bar link, as every logo on the web does. Defaults to `"/"`; set it
	 * when your home screen lives elsewhere. It's an ordinary link, so the
	 * usual rules apply: a home that is already open in the stack — its first
	 * panel, usually — is returned to, closing nothing, and one that isn't is
	 * opened the way a nav item would be. Pass `null` to link neither — for a
	 * `title` or `logo` slot holding interactive content of its own, which
	 * can't sit inside a link. Routed mode only.
	 */
	home?: string | null;
	/**
	 * The app's own chrome, at the trailing end of the top bar: an account
	 * button, a global search box, a settings menu. It may grow into the bar's
	 * free space (so a search box is at home here); the title truncates before it
	 * gives any of it back.
	 *
	 * In routed mode a narrow shell hands this slot to the current panel's
	 * {@link Panel.actions} whenever it has any — on a phone the screen's own
	 * verbs win the space — and keeps the app's menu for the screens that
	 * declare none.
	 */
	menu?: Slot;
	/**
	 * The scrollable panel content. A string is rendered as rich text.
	 * Mutually exclusive with {@link MainOptions.routes}.
	 */
	content?: Slot;
	/**
	 * Paths mapped to the functions that draw them, which hands navigation over
	 * to the shell. Each route draws one screen of your app, called a panel, and
	 * as many columns as fit are shown at a time: one at a time on a phone,
	 * several side by side on a wider screen. Mutually exclusive with
	 * {@link MainOptions.content}.
	 *
	 * A segment wrapped in brackets is a param: `[name]` matches one segment as
	 * a string, `[name=integer]` matches one segment as a number, and a trailing
	 * `[...name]` matches the rest of the path as one raw (still percent-encoded)
	 * string, so it has to come last and needs at least one segment to match.
	 * The first key that matches wins, a segment a param refuses falls through
	 * to a later route (or to {@link MainOptions.notFound}), and each handler's
	 * `$panel.params` is typed from its own key.
	 *
	 * `integer` accepts only spellings that survive a round trip back to the
	 * same URL, so `/tasks/0042` is not a second path for `/tasks/42`. Ids that
	 * aren't safe integers, such as snowflakes, want a plain `[id]`.
	 *
	 * Navigating is just links: the shell handles the clicks itself, so do *not*
	 * also call Aberdeen's `interceptLinks()`. A link opens its target on top of
	 * the panel it sits in, closing everything after that panel first. The
	 * `data-panel` attribute picks another of the three {@link PanelStack}
	 * navigations instead: `replace` puts the target in place of the link's own
	 * panel, and `open` leaves that panel behind and gives the target its own
	 * stack, the way a nav item does. A link
	 * to something already open goes back to it rather than opening it twice —
	 * a move along the stack that closes nothing: the panels right of it stay
	 * open, parked past the viewport's right edge, until a *new* panel prunes
	 * them (pinned panels excepted — see {@link Panel.pinned}).
	 * From code, use {@link pushPanel} and friends: navigating
	 * with `aberdeen/route`'s own `go()` works too — a panel with
	 * {@link Panel.unsaved} work still survives it — but builds the whole stack
	 * from the path. A navigation guard the app registered with
	 * `route.setGuard` (an auth redirect, say) keeps working: the shell
	 * registers none of its own.
	 *
	 * **A panel declares its chrome; the shell places it.** A panel says what it
	 * is called ({@link Panel.title} — unset, its first line of text stands in)
	 * and what it can do ({@link Panel.actions}); everything else in a column is
	 * the panel's own content, boxes included. The shell writes the stack of
	 * open panels as breadcrumbs in the top bar — click one to go back to it,
	 * closing nothing — and places each panel's actions where the room is: on
	 * its own column while several fit, in the bar once the shell is narrow and
	 * the current panel *is* the screen. Nothing in an app measures the
	 * viewport to lay its screens out twice.
	 *
	 * Only one routed shell can be mounted at a time (a second one throws) —
	 * the URL is global, so two of them would fight over it. Nothing else is:
	 * the {@link PanelStack} belongs to its shell, which hands it back, and
	 * each handler gets its own `$panel` rather than there being one global
	 * "current panel", since several panels are alive at once. It's that
	 * argument that carries the per-route typing of `params`.
	 *
	 * @example
	 * ```ts
	 * S.main({
	 *   title: "Trackle",
	 *   nav: { items: [{ label: "Projects", href: "/projects" }] },
	 *   routes: {
	 *     "/projects": ($panel) => { $panel.title = "Projects"; drawProjects(); },
	 *     "/projects/[id]": ($panel) => drawProject($panel.params.id),  // typed string
	 *   },
	 *   notFound: ($panel) => S.box({ header: "Not found", content: $panel.path }),
	 * });
	 * ```
	 */
	routes?: R;
	/**
	 * Draws the panel for a path none of the routes match. There are no params
	 * to go with it, so `$panel.params` is empty; the path itself is in
	 * `$panel.path`.
	 */
	notFound?: RouteHandler<{}>;
	/**
	 * What to open **beneath** a path that arrives cold — a shared link, a
	 * bookmark, a push notification, a nav item — with no stack of its own to
	 * restore. Keyed by path template exactly like {@link MainOptions.routes}, so
	 * each entry gets that key's params, matched and typed, rather than taking
	 * the path apart a second time.
	 *
	 * Without this, the stack is derived from the path: every prefix that has a
	 * route becomes a column, so `/projects/7/tasks/42` opens three deep. That
	 * only works for URLs that spell their own context out. A flat one —
	 * `/thread/[id]`, where a notification lands — has no prefix to walk, so it
	 * opens as a single column with nothing under it and nothing to close back
	 * to. This is where you say what that context is:
	 *
	 * ```ts
	 * S.main({
	 *   routes: {
	 *     "/mailbox/[id]": drawMailbox,
	 *     "/thread/[id=integer]": drawThread,
	 *   },
	 *   ancestors: {
	 *     "/thread/[id=integer]": ({ id }) => [`/mailbox/${mailboxOf(id)}`],  // id: number
	 *   },
	 * });
	 * ```
	 *
	 * Return the paths shallowest first; the path itself goes on top. Return
	 * nothing to leave a path to the prefix derivation, which is also what an
	 * unlisted one gets — so you only list the routes whose URL doesn't say where
	 * it belongs. Paths you have no route for are skipped, as they are there.
	 *
	 * This is asked for every origin-less navigation, so a nav item and a fresh
	 * tab still land on the same columns; a link *inside* a panel builds on that
	 * panel instead and never asks. It's consulted while the navigation is
	 * still being worked out — before any route handler runs — so it has to
	 * answer without drawing anything. From code,
	 * {@link PanelStack.openPanelStack} takes the same list directly.
	 */
	// `NoInfer`, because `R` is inferred from `routes` alone: a second inference
	// site for it would make TypeScript reconcile the two, and every handler's
	// `$panel` would quietly degrade to `any` (see the note on `main` below).
	ancestors?: AncestorTable<NoInfer<R>>;
	/**
	 * How many panels are *shown* at a time. `"auto"` (the default) shows as
	 * many columns, side by side, as comfortably fit, ending at the current
	 * panel; `"single"` shows only the current panel, however wide the screen
	 * — the phone experience at every size (the nav sidebar still sits beside
	 * it). Only the display differs: the stack, the breadcrumbs, the URL,
	 * Escape and the back button behave identically in both. Routed mode only.
	 */
	columns?: "auto" | "single";
	/**
	 * What a link *without* a `data-panel` attribute does — the per-link
	 * attribute always wins. `"push"` (the default) opens the target on top of
	 * the panel the link sits in; `"replace"` opens it in that panel's place;
	 * `"open"` gives it its own stack, the way a nav item does. With `"open"`
	 * every click replaces the content as a whole — which, with flat routes,
	 * is the conventional sidebar-and-content app: one pane, swapped on every
	 * click, the crumb line simply naming it. Routed mode only.
	 */
	linkNavigation?: "push" | "replace" | "open";
	/** Footer content, pinned below the scroll area. */
	footer?: Slot;
	/**
	 * Max width for the panel's *content*, e.g. `"60rem"`. The header and footer
	 * backgrounds still span the full shell width, but their contents — and the
	 * sidebar + separator + content trio (or just the content when there's no
	 * sidebar) — cap to this width and centre horizontally. When unset, everything
	 * fills the available width. Either way the content shares the panel surface —
	 * it is not boxed.
	 *
	 * Ignored when you pass {@link MainOptions.routes}: there the open panels
	 * decide the width (see {@link Panel.maxWidth}), and the header and footer line
	 * themselves up with them.
	 */
	maxWidth?: string;
	/** Aberdeen attr/style string applied to the content area. */
	contentAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the top bar. */
	topbarAttrs?: Attributes;
	/**
	 * Navigation menu, rendered as a sidebar beside the content. The sidebar
	 * collapses to a ☰ in the top bar when the shell is narrow, and there it
	 * opens the nav as a full panel sliding in from the left, not as a dropdown.
	 *
	 * `items` may be a reactive array: the shell reads it inside the sidebar's own
	 * scope, so an item arriving or leaving redraws the sidebar and nothing else.
	 * The content beside it — in routed mode, the whole stack — is left
	 * alone. `button` customizes the ☰; `dropdownAttrs` does nothing here, since
	 * a collapsed nav is a panel rather than a dropdown.
	 */
	nav?: MenuOptions;
	/**
	 * Which side the nav sidebar sits on. Defaults to `"left"`.
	 *
	 * Either way it collapses to a ☰ in the top bar once the shell width drops to
	 * 640 px or below — the one threshold everything else keys off too, which is
	 * why there is no "always a button" mode: it would make "narrow" and "the nav
	 * is collapsed" two different things, and every rule about where a panel's
	 * chrome goes assumes they are one.
	 */
	navPosition?: "left" | "right";
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
		// The bar reads `[leading] [title] …spacer… [trailing]`. The spacer is the
		// trailing slot's own growth: it takes the free space and right-aligns
		// itself in it, which is what lets a search box live there. When the two
		// compete, the title truncates first — but only down to a floor, past
		// which the trailing slot shrinks instead: a wide search box must not
		// starve the titles to nothing (the crumb strip's overlay buttons would
		// escape their zero-width strip, over the ☰ beside it).
		"> header > .s-bar, > footer > .s-bar": "display:flex align-items:center width:100% margin-inline:auto gap:$3 padding: $2 $3;",
		"> header .s-logo, > header .s-nav-trigger": "display:flex align-items:center flex-shrink:0",
		// The ☰ is a glyph in a 2rem hit area, so it carries ~6px of its own
		// padding: pull it back by that, and the glyph — not its hit area — lines
		// up with the bar's edge and with the stack below.
		"> header .s-nav-trigger": "margin-left:-0.375rem",
		"> header .s-logo": "font-size:1.4em background: $s-gradient; -webkit-background-clip:text; background-clip:text; color:transparent;",
		"> header .s-titles": "display:flex flex-direction:column min-width:5rem flex: 0 1 auto;",
		// Same font-size and line-height as `.s-crumb`, because in routed mode the
		// two take turns on this line (see `drawSecondLine`): a different height
		// would jog the whole bar as they swap.
		"> header .s-subtitle": "fg:$s-muted font-size:0.85em line-height:1.5 overflow:hidden text-overflow:ellipsis white-space:nowrap",
		"> header .s-title": "font-weight:800 font-size:1.1em line-height:1.2 overflow:hidden text-overflow:ellipsis white-space:nowrap letter-spacing:-0.01em background: $s-gradient; -webkit-background-clip:text; background-clip:text; color:transparent; width:fit-content max-width:100%",
		// In routed mode the logo and the app's name are links to the app's home:
		// strip the reset's link chrome down to the styling the div forms carry,
		// which their classes then provide. (`filter:none` keeps the global
		// `a:hover` brighten off the gradient text.)
		"> header a.s-logo, > header a.s-title": "text-decoration:none filter:none cursor:pointer",
		"> header .s-menu": "display:flex align-items:center justify-content:flex-end gap:$2 flex: 1 1 auto; min-width:0",
		// Body always wraps <main> (with or without a sidebar) so max-width centering
		// and scrollbar alignment work identically in both cases.
		// .s-body centres .s-body-inner; .s-body-inner caps the content to maxWidth.
		// It's also the positioning + clipping context for the narrow-screen nav panel,
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
		// incoming half of the nav-panel hand-off — see `slideContentIn`.
		".s-body main":
			"flex:1 min-width:0 min-height:0 overflow-x:hidden overflow-y:auto display:flex flex-direction:column " +
			"transition: transform var(--s-panel-ms) ease;",
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
		// Routed mode takes its width from the stack instead of from
		// `maxWidth`: the layout engine publishes the ensemble width (sidebar +
		// separator + content area) as --s-shell-w — the standard 1280px page
		// normally, the window's edges while a "screen" page is up — and the body
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
	// Borderless and transparent so the panel's own surface shows through — an airy,
	// floating sidebar whose only chrome is the active item's accent colouring.
	".s-nav-panel": {
		// The generous horizontal padding is what keeps the rows clear of the content
		// separator on one side and the shell edge on the other; the vertical scroll
		// (overflow-y:auto, which also clips overflow-x) leaves no room to bleed past it.
		"&": "display:flex flex-direction:column overflow-y:auto flex-shrink:0 max-width:228px padding:$3 gap:$1",
	},
	// The narrow-screen nav: a full "panel" that slides in over the content from the
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
			"transition: transform var(--s-panel-ms) ease;",
		// Parked one screen to the left: the state the `create=`/`destroy=` hooks
		// transition out of and back into.
		"&.s-nav-page-off": "transform:translateX(-100%) pointer-events:none",
		// Roomier rows than the dropdown's: this is the whole screen, and every row
		// is a thumb target.
		".s-menu-item": "padding: $2 $3; min-height:3rem font-size:1.05em gap:$3",
	},
	// Collapse the sidebar when the shell is narrow. The ☰ that replaces it isn't
	// hidden here but simply not drawn (see `main()`), because the same boolean
	// also decides what the rest of the bar shows — one decision, in one place.
	[`@container (max-width: ${NARROW_PX}px)`]: {
		".s-main .s-nav-panel, .s-main .s-nav-sep": "display:none",
		// A phone's bar holds two lines of chrome in a screen's width, so it buys
		// the stack and the screen's actions room by spending less on air.
		".s-main > header > .s-bar": "gap:$1 padding: $1 $2;",
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
 * top bar (logo, title, action menu), a scrollable content area, and a
 * footer. With {@link MainOptions.maxWidth} the content area is centred and its
 * width capped. Add a `nav` to get a sidebar that collapses to a ☰ in the top bar
 * below 640 px, which there opens the nav as a full panel sliding in from the
 * left; picking an item slides it away as the chosen screen enters from the
 * right.
 *
 * Instead of a single `content` slot, pass {@link MainOptions.routes} and the
 * shell takes over navigation: each route draws one screen, called a panel,
 * and as many columns as fit are shown at a time, side by side on a wide screen
 * and one at a time on a phone. Each panel *declares* its chrome — its
 * {@link Panel.title} and its {@link Panel.actions} — and this shell places it:
 * the stack of titles as breadcrumbs in the bar, the actions on the panel's
 * column while several fit and in the bar once the shell is narrow enough
 * that the current panel is the whole screen. See {@link MainOptions.routes} and
 * {@link Panel}.
 *
 * @example
 * ```ts
 * S.main({
 *   logo: "✦",
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
// The self-referential constraint is what types each handler's `$panel.params`
// from its own route key. It deliberately has no default: giving `R` one makes
// TypeScript fall back to it for contextual typing, and every `$panel.params`
// silently degrades to `any`. Callers that pass no `routes` are unaffected —
// `MainOptions`'s own default kicks in there.
export function main<R extends RouteTable<R>>(opts: MainOptions<R> & { routes: object }): PanelStack;
export function main(opts?: MainOptions<{}> & { routes?: undefined }): void;
export function main<R extends RouteTable<R>>(opts: MainOptions<R> = {}): PanelStack | void {
	// Whether there is a nav to show is deliberately NOT worked out here: `items`
	// may well be a reactive array, and reading it in the shell's own scope would
	// subscribe *the whole shell* to it — an item arriving later would redraw the
	// lot, and in routed mode that means tearing the stack down and building
	// it again from the URL. So every use below reads `nav.items` inside its own
	// scope, and only that scope redraws.
	const nav = opts.nav;
	const navPos = opts.navPosition ?? "left";
	// Whether the narrow-screen full-page nav is showing. Per shell, so nested or
	// sibling `main()`s can't fight over it.
	const $nav = A.proxy({ open: false });
	// Whether the shell is narrow: its container is at or below NARROW_PX, the
	// very threshold the `@container` queries above switch the sidebar on. One
	// boolean, read by everything that has to agree about which regime we are in —
	// the bar's layout, what the ☰ does, and where a panel's chrome goes — so they
	// cannot drift apart. Its initial value is a guess from the viewport (a shell
	// is rarely wider than that) which `watchNarrow` corrects before the first
	// paint; guessing well just saves a redraw of anything keyed on it.
	const $shell = A.proxy({
		narrow: typeof document !== "undefined" && document.documentElement.clientWidth <= NARROW_PX,
	});

	const routes = opts.routes as Routes | undefined;
	if (routes != null && opts.content != null) {
		throw new Error("Staffa: S.main() takes either `content` or `routes`, not both");
	}
	// The stack owns the routing, so it starts observing (and building its
	// stack from) the URL before any of the shell is drawn — the top bar's back
	// button already needs to know how deep we are. Its options are listed one by
	// one rather than spread from `opts`: a spread reads every key, which on a
	// proxied options object subscribes this scope to all of them.
	const ctl = routes
		? new PanelStackController({
			routes,
			notFound: opts.notFound,
			ancestors: opts.ancestors,
			columns: opts.columns,
			linkNavigation: opts.linkNavigation,
			title: opts.title,
			$shell,
		})
		: null;
	// Where the brand mark and the app's name link — or nowhere, when the app
	// said `home: null` (a title slot holding a control of its own, say).
	const homeHref = ctl && opts.home !== null ? opts.home ?? "/" : null;
	// Routed mode caps the shell to the ensemble width the layout engine publishes,
	// rather than to `maxWidth`.
	const capWidth = ctl ? null : opts.maxWidth;

	const root = A(`div.s-main${ctl ? ".s-routed" : ""}`, opts.attrs, () => {
		// Which side the sidebar is on, as a class on the shell for the CSS above to
		// hang off. Its own scope (see `nav` above), so a nav appearing or emptying
		// out only retags the shell rather than redrawing it.
		A(() => {
			if (nav == null || !nav.items.length) return;
			A(`.s-nav-${navPos}`);
		});

		// Top bar: `[leading] [identity] …spacer… [trailing]`, where each slot's
		// contents depend on how much room the shell has and — in routed mode — on
		// what the current panel declared. Each is its own scope, so a resize across
		// the threshold or a panel renaming itself moves the chrome without
		// disturbing anything else. A routed shell always has a bar: it is where
		// the breadcrumb stack lives, and where a panel's actions land once the
		// shell is narrow.
		A(() => {
			const hasBar =
				ctl != null ||
				opts.title != null ||
				opts.subtitle != null ||
				opts.logo != null ||
				opts.menu != null ||
				(nav != null && nav.items.length > 0);
			if (!hasBar) return;
			A("header.s-s.neutral", opts.topbarAttrs, () => {
				A("div.s-bar", () => {
					// Cap the bar's content to maxWidth and centre it within the full-width header.
					A(() => {
						if (capWidth != null) A("max-width:", capWidth);
					});

					// Leading: the ☰ once the nav has collapsed, the logo otherwise.
					// Deliberately no back button, at any width: going back is the
					// stack's job in both regimes (plus Escape and the browser's own
					// back). A « here would hand a narrow shell a way out that a wide
					// one hasn't got, and it would have to displace the ☰ to fit —
					// leaving a phone with no way to the app's navigation at all
					// until it had closed its way back to the stack's first panel.
					A(() => {
						if ($shell.narrow) {
							if (nav != null && nav.items.length) {
								A("div.s-nav-trigger", () => drawNavTrigger(nav, $nav));
								return;
							}
						}
						if (opts.logo == null) return;
						// In routed mode the brand mark is a link to the app's home,
						// twinned with the app's name beside it — a real link, so it
						// has an address to hover, middle-click and copy, and a click
						// runs the shell's usual link rules.
						A(homeHref != null ? "a.s-logo aria-label=Home" : "div.s-logo", () => {
							if (homeHref != null) A("href=", homeHref);
							drawSlot(opts.logo);
						});
					});

					// The identity block: the brand on the first line — always; a
					// routed shell never renames itself, because the breadcrumb stack
					// on the line beneath already says where you are, in both regimes.
					// The name links to the app's home, the counterpart of the
					// crumbs it sits above.
					A("div.s-titles", () => {
						A(() => {
							if (opts.title == null) return;
							A(homeHref != null ? "a.s-title" : "div.s-title", () => {
								if (homeHref != null) A("href=", homeHref);
								drawSlot(opts.title);
							});
						});
						drawSecondLine(opts, ctl, nav, $shell);
					});

					// Trailing: on a narrow shell the screen's own verbs win the space,
					// and a screen with none of its own leaves the app's chrome up.
					// Promoted actions are marked as the current panel's own chrome
					// (`.s-panel-origin`), so a link among them still builds on that
					// panel — see `interceptLinks` in panels.ts.
					A(() => {
						const actions = $shell.narrow ? ctl?.currentPanel?.actions : undefined;
						const slot = actions ?? opts.menu;
						if (slot != null) A(`div.s-menu${actions != null ? ".s-panel-origin" : ""}`, () => drawSlot(slot));
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
				// The sidebar, in its own scope so a changing item list redraws just
				// it — never the content area beside it (see `nav` above).
				A(() => {
					if (nav == null || !nav.items.length) return;
					A(`nav.s-nav-panel.s-nav-${navPos}`, opts.navAttrs, () => {
						drawMenu(nav.items);
					});
					A("div.s-nav-sep aria-hidden=true");
				});
				drawMainContent(opts, ctl);
			});
			// The narrow-screen nav panel, laid over the body it slides across.
			A(() => {
				if (nav != null && nav.items.length && $nav.open) drawNavPage(nav, opts.navPageAttrs, $nav, $shell);
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

	watchNarrow(root, $shell);

	// Escape peels back a panel of UI, and finally jumps to the navigation: into
	// the sidebar's current item when the sidebar is showing, or — when it has
	// collapsed to the ☰ — open the full-page nav, which focuses its current item.
	// Listens on `document` so it works wherever focus is, but bows out while
	// another overlay (a dialog, or an open menu) is up — those handle Escape
	// themselves.
	if (nav != null || ctl) {
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
			// With a panel to the current one's left, Escape steps back along the
			// stack: it closes the current panel when that panel is the stack's
			// last, and just goes one panel left when panels are parked beyond it.
			// A panel holding unsaved work isn't closed but parked, like a
			// mid-stack one. There is no button for this — the crumbs are the
			// pointing device's way back.
			if (ctl && ctl.currentPanelIndex > 0) {
				e.preventDefault();
				void ctl.back();
				return;
			}
			// Whether there is a nav at all is asked of the DOM, not of `nav.items`:
			// a subscription here would be one on the shell's own scope again, and
			// an empty nav simply has neither of the two elements below.
			// `offsetParent` is null when the sidebar is hidden (display:none).
			const sidebar = root.querySelector<HTMLElement>(".s-nav-panel");
			if (sidebar?.offsetParent != null) {
				const item =
					sidebar.querySelector<HTMLElement>("[aria-current=page]") ??
					sidebar.querySelector<HTMLElement>(".s-menu-item:not([aria-disabled=true])");
				if (item) { e.preventDefault(); item.focus(); }
				return;
			}
			if (trigger) { e.preventDefault(); trigger.click(); }
		};
		document.addEventListener("keydown", onKey);
		A.clean(() => document.removeEventListener("keydown", onKey));
	}

	// The stack is this shell's, not the app's: it is handed back rather than
	// parked in a module-level global, so nothing can reach a shell it isn't in.
	return ctl ?? undefined;
}

/**
 * Dismisses the collapsed nav if it's showing: at most one shell has its nav up
 * as an overlay at a time, so this needs nothing passed in. Set by the thing
 * that opens one (see {@link closeNav}).
 */
let openNav: (() => void) | null = null;

/**
 * Close the navigation, if it's showing as an overlay — the full panel it becomes
 * on a narrow shell. A sidebar isn't an overlay and has nothing to dismiss, so
 * on a wider shell this does nothing.
 *
 * A navigation closes the nav by itself, links in your own custom rows included,
 * so this is for the items that *don't* navigate — one that opens a dialog, or
 * flips a setting, and should still get the nav out of the way.
 *
 * @example
 * ```ts
 * S.main({
 *   nav: { items: [
 *     { label: "Inbox", href: "/inbox" },
 *     () => S.button({ content: "New message", click: () => { S.closeNav(); compose(); } }),
 *   ]},
 *   routes: { ... },
 * });
 * ```
 */
export function closeNav(): void {
	openNav?.();
}

/**
 * The line under the app's name: the breadcrumb stack, or the app's own
 * {@link MainOptions.subtitle} in its place.
 *
 * A routed shell hands the line to the tagline only while the crumbs would be
 * repeating what is already on screen — one panel open, that panel being a nav
 * item's own screen, and the sidebar there to show it highlighted. That last
 * condition is why a narrow shell always keeps the stack: the nav is behind the
 * ☰ there, so nothing else names the screen. An app with no subtitle to show
 * never asks any of this, and its crumbs simply mount once.
 *
 * One scope for the whole decision, so a navigation, a resize across the
 * threshold or a nav item arriving swaps the line without disturbing the bar
 * around it — and so that reading `nav.items` subscribes this line alone,
 * never the shell entire (see `nav` in `main()`).
 */
function drawSecondLine(
	opts: MainOptions<any>,
	ctl: PanelStackController | null,
	nav: MenuOptions | undefined,
	$shell: { narrow: boolean },
): void {
	A(() => {
		// Short-circuit first: with no subtitle, nothing below is read, so the
		// crumbs keep the line for good and this scope never re-runs.
		if (opts.subtitle != null && (ctl == null || taglineFits(ctl, nav, $shell))) {
			A("div.s-subtitle", () => drawSlot(opts.subtitle));
			return;
		}
		ctl?.drawCrumbs();
	});
}

/**
 * Whether the stack would only be saying what the sidebar already says: a
 * single panel open, the sidebar on screen, and that panel being one of the nav's
 * own rows.
 *
 * The row test is {@link matchCurrent} — the very thing that marks a row
 * `aria-current=page` — so "the crumb is redundant" and "the sidebar has it
 * highlighted" can never come apart. It compares whole paths, so it is true
 * only for a nav item's own screen, never for one opened beneath it.
 */
function taglineFits(ctl: PanelStackController, nav: MenuOptions | undefined, $shell: { narrow: boolean }): boolean {
	if ($shell.narrow || nav == null) return false;
	if (ctl.panels.length > 1) return false;
	return nav.items.some((entry: MenuEntry) =>
		typeof entry !== "string" &&
		typeof entry !== "function" &&
		!("separator" in entry) &&
		entry.href != null &&
		matchCurrent(entry.href));
}

/**
 * Track whether the shell is narrow, for everything that has to agree about it.
 *
 * The *content* box is what's measured, because that is what an `inline-size`
 * `@container` query measures: reading `clientWidth` instead would count any
 * padding a caller put on the shell, and the JS and the CSS would then disagree
 * about the regime at exactly the widths where it matters.
 */
function watchNarrow(root: HTMLElement, $shell: { narrow: boolean }): void {
	if (typeof ResizeObserver === "undefined") return;
	const ro = new ResizeObserver((entries) => {
		const box = entries[0]?.contentBoxSize?.[0];
		const width = box ? box.inlineSize : entries[0]?.contentRect.width;
		if (width != null) $shell.narrow = width <= NARROW_PX;
	});
	ro.observe(root);
	A.clean(() => ro.disconnect());
}

/**
 * The hamburger in the top bar, which is where the sidebar goes when the shell
 * is too narrow to hold one. It opens the nav as a full panel — on a phone a nav
 * is a screenful of UI, not a popup — and a second click closes it again.
 *
 * A bare glyph, like the ✕ on a panel: the trigger
 * is a way *in* to the app, not something to be sold on, and a bordered box
 * around it shouts down the title it sits beside.
 */
function drawNavTrigger(nav: MenuOptions, $nav: { open: boolean }): void {
	iconButton({
		// The glyph doubles as the state: ☰ to open the panel, ✕ to dismiss it. Its
		// own scope, so toggling doesn't rebuild (and re-focus) the button.
		icon: nav.button?.icon ?? (() => A(() => ($nav.open ? closeIcon : menuIcon)())),
		ariaLabel: nav.button?.ariaLabel ?? "Open navigation",
		attrs: nav.button?.attrs,
		click: () => { $nav.open = !$nav.open; },
	});
}

/**
 * The narrow-screen navigation: a full panel sliding in over the content from the
 * left. Picking an item slides it back out while the chosen screen enters from
 * the right, so the two tile across the viewport and the whole thing reads as a
 * lateral move rather than a popup blinking out.
 */
function drawNavPage(
	nav: MenuOptions,
	attrs: Attributes | undefined,
	$nav: { open: boolean },
	$shell: { narrow: boolean },
): void {
	// Whether this close is a *navigation* — the only kind that hands over to an
	// incoming screen. Dismissing the panel just uncovers the content again.
	let navigated = false;
	const dismiss = () => { navigated = true; $nav.open = false; };

	const pageEl = A(
		"nav.s-nav-page.s-s.neutral aria-label=Navigation create=s-nav-page-off destroy=s-nav-page-off",
		attrs,
		() => drawMenu(nav.items, dismiss),
	) as HTMLElement;

	// This is the shell's one nav overlay, so `closeNav()` knows where to aim.
	openNav = dismiss;
	A.clean(() => { if (openNav === dismiss) openNav = null; });

	// Whatever the panel navigated to, it hands over to: the items do that
	// themselves (`dismiss` above), but custom slot content — a link in a row the
	// shell knows nothing about — doesn't, and neither does a navigation from
	// anywhere else. A branch row expanding is the exception: it navigates in
	// order to unfold, and the nav should stay up while the user works down the
	// tree. Its own scope, so it can't redraw the panel it closes.
	const openedAt = A.peek(currentRoute, "path");
	A(() => { if (currentRoute.path !== openedAt && !consumeBranchNav(currentRoute.path)) dismiss(); });

	const shell = pageEl.closest<HTMLElement>(".s-main");
	const behind = pageEl.parentElement?.querySelector<HTMLElement>(":scope > .s-body-inner");
	// Content mode's incoming half of the hand-off. In routed mode there is no
	// <main> to slide: the chosen screen is a freshly pushed panel, which plays
	// its own enter animation, so this correctly finds nothing.
	const content = behind?.querySelector<HTMLElement>(":scope > main");

	// The content is fully covered, but without this it stays tabbable and visible
	// to screen readers underneath the panel.
	behind?.setAttribute("inert", "");

	// Widening the shell past the collapse point brings the sidebar back, leaving
	// this panel covering the content for no reason — so bow out. Read from the
	// shell's own flag rather than measured again here, so the panel and the ☰ that
	// opened it never disagree about whether the shell is still narrow.
	A(() => { if (!$shell.narrow) $nav.open = false; });

	A.clean(() => {
		behind?.removeAttribute("inert");
		if (!navigated) return;
		// Same tick as the panel's own destroy transition, so both halves of the
		// hand-off move in lockstep.
		if (content) slideContentIn(content);
		shell?.querySelector<HTMLElement>(".s-nav-trigger button")?.focus();
	});

	// Land on the current panel's entry (or the first one) once we're laid out.
	requestAnimationFrame(() => {
		if (document.body.contains(pageEl)) focusFirst(pageEl, ".s-menu-item[aria-current=page]");
	});
}

/**
 * Play the incoming half of the nav-panel hand-off: park `el` one screen to the
 * right, then let its CSS transition carry it home. Reading `offsetWidth` in
 * between forces the browser to adopt the parked position as the "before" state,
 * which is what makes the removal animate instead of doing nothing at all.
 */
function slideContentIn(el: HTMLElement): void {
	el.classList.add("s-slide-in");
	void el.offsetWidth;
	el.classList.remove("s-slide-in");
}

function drawMainContent(opts: MainOptions<any>, ctl: PanelStackController | null): void {
	// Routed mode replaces the single scrollable <main> with the column viewport,
	// which manages its own columns (and their scrolling) from JS.
	if (ctl) {
		ctl.drawColumns();
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

import A from "aberdeen";
import { type Content, type Slot, type Attributes, drawSlot } from "../core.js";
import { type MenuOptions, menuButton, drawMenu } from "./menu.js";

/** Options for {@link main}. */
export interface MainOptions {
	/** Aberdeen attr/style string applied to the outermost shell element. */
	attrs?: Attributes;
	/** App/page title shown in the top bar. */
	title?: Slot;
	/** Secondary line under the title. */
	subtitle?: Slot;
	/** Leading icon/logo in the top bar. */
	icon?: Slot;
	/** Action area on the right of the top bar (buttons, menu, ...). */
	menu?: Content;
	/** The scrollable page content. */
	content?: Content;
	/** Footer content, pinned below the scroll area. */
	footer?: Slot;
	/**
	 * Max width for the page's *content*, e.g. `"60rem"`. The header and footer
	 * backgrounds still span the full shell width, but their contents — and the
	 * sidebar + separator + content trio (or just the content when there's no
	 * sidebar) — cap to this width and centre horizontally. When unset, everything
	 * fills the available width. Either way the content shares the page surface —
	 * it is not boxed.
	 */
	maxWidth?: string;
	/** Aberdeen attr/style string applied to the content area. */
	contentAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the top bar. */
	topbarAttrs?: Attributes;
	/**
	 * Navigation menu. When provided, renders a sidebar (in `"left"` / `"right"`
	 * mode) or a button+dropdown (in `"button"` mode). The sidebar automatically
	 * collapses to button mode when the shell is too narrow.
	 */
	nav?: MenuOptions;
	/**
	 * Where to render the nav. Defaults to `"left"`.
	 * - `"left"` / `"right"`: sidebar next to the content area; collapses to a
	 *   button+dropdown in the top bar when the shell width drops below 640 px.
	 * - `"button"`: always a button+dropdown, never a sidebar.
	 */
	navPosition?: "left" | "right" | "button";
	/** Aberdeen attr/style string applied to the sidebar nav panel. */
	navAttrs?: Attributes;
}

A.insertGlobalCss({
	".s-main": {
		// container-type so @container queries below can respond to shell width.
		"&": "display:flex flex-direction:column min-height:100vh max-height:100vh container-type:inline-size",
		// Header/footer stretch their background the full shell width; their inner
		// `.s-bar` caps to maxWidth and centres, so chrome aligns with the content.
		"> header": "border-bottom: 1px solid $s-border; position:sticky top:0 z-index:10",
		"> footer": "border-top: 1px solid $s-border; fg:$s-fg-muted",
		"> header > .s-bar, > footer > .s-bar": "display:flex align-items:center width:100% margin-inline:auto gap:$3 padding: $2 $3;",
		"> header .s-header-icon": "display:flex align-items:center font-size:1.4em background: $s-gradient; -webkit-background-clip:text; background-clip:text; color:transparent;",
		"> header .s-titles": "display:flex flex-direction:column min-width:0 flex:1",
		"> header .s-title": "font-weight:800 font-size:1.1em line-height:1.2 overflow:hidden text-overflow:ellipsis white-space:nowrap letter-spacing:-0.01em background: $s-gradient; -webkit-background-clip:text; background-clip:text; color:transparent; width:fit-content max-width:100%",
		"> header .s-subtitle": "fg:$s-fg-muted font-size:0.85em overflow:hidden text-overflow:ellipsis white-space:nowrap",
		"> header .s-menu": "display:flex align-items:center gap:$2",
		// Body holds sidebar + separator + <main> side by side (only used in sidebar
		// nav mode). It centres `.s-body-inner`, which caps the trio to maxWidth.
		".s-body": "flex:1 overflow:hidden display:flex flex-direction:row min-height:0 justify-content:center",
		".s-body-inner": "flex:1 display:flex flex-direction:row min-height:0",
		// Put the sidebar on the right (content fills the left) for right-hand navs.
		"&.s-nav-right .s-body-inner": "flex-direction:row-reverse",
		// A vertical hairline between sidebar and content, fading out at both ends —
		// the vertical sibling of the menu's `hr.s-menu-sep`.
		".s-nav-sep": "width:1px flex-shrink:0 align-self:stretch margin: 0.6rem 0; border:0 background: linear-gradient(to bottom, transparent, $s-border-strong 18%, $s-border-strong 82%, transparent);",
		// Without a sidebar, <main> is a direct child; with one it lives in .s-body.
		"> main, .s-body main": "flex:1 overflow-y:auto display:flex flex-direction:column",
		// The content area fills the scroll region with comfortable padding. Without a
		// sidebar it caps its own width to maxWidth and centres (applied inline in
		// drawMainContent); with one, `.s-body-inner` does the capping for the trio.
		// It is deliberately NOT a boxed "sheet" — content brings its own boxes.
		"> main > .s-content, .s-body main > .s-content": "width:100% flex:1 p:$3",
		// When <main> actually shows a vertical scrollbar (the `.s-scroll-y` class is
		// toggled from JS by watchVerticalOverflow), inset it from the shell edge by
		// $3 so the bar's right edge lines up with the header/footer content (which
		// sits $3 inside the edge via `.s-bar` padding). The $3 gap between the content
		// and the bar already comes from `.s-content`'s padding. Without a scrollbar
		// there's no margin, so the content keeps its single $3 edge — not 2×$3.
		"> main.s-scroll-y, .s-body main.s-scroll-y": "margin-right:$3",
	},
	// Sidebar nav panel. Items reuse the shared `.s-menu-item[-link]` /
	// `.s-menu-sep` styles from menu.ts, so the sidebar and the floating
	// dropdown stay visually identical.
	// Borderless and transparent so the page's aurora shows through — an airy,
	// floating sidebar whose only chrome is the active item's gradient pill.
	".s-nav-panel": {
		// Extra horizontal padding leaves room for the active pill's glow, which the
		// vertical scroll (overflow-y:auto, which also clips overflow-x) would
		// otherwise cut off at the panel edges.
		"&": "display:flex flex-direction:column overflow-y:auto flex-shrink:0 max-width:228px padding:$3 gap:$1 background:transparent",
	},
	// In button-only mode (or always-button navPosition), hide the sidebar and
	// show the trigger. In sidebar mode, show the panel and hide the trigger.
	// CSS @container queries handle the responsive collapse automatically.
	".s-main.s-nav-left .s-nav-trigger, .s-main.s-nav-right .s-nav-trigger": "display:none",
	".s-main.s-nav-btn-only .s-nav-panel": "display:none",
	".s-main.s-nav-btn-only .s-nav-trigger": "display:flex",
	// Collapse sidebar → button when shell is narrow.
	"@container (max-width: 640px)": {
		".s-main.s-nav-left .s-nav-panel, .s-main.s-nav-right .s-nav-panel, .s-main .s-nav-sep": "display:none",
		".s-main.s-nav-left .s-nav-trigger, .s-main.s-nav-right .s-nav-trigger": "display:flex",
		// On phones a top-level content box becomes a full-bleed block: pull it out
		// to negate the content padding and drop the rounded corners.
		".s-content > .s-box": "margin-inline: calc(-1 * $3); r:0 border-inline:0",
	},
});

/**
 * An application shell that wires up the things almost every app needs: a sticky
 * top bar (icon, title, subtitle, action menu), a scrollable content area, and a
 * footer. With {@link MainOptions.maxWidth} the content area is centred and its
 * width capped. Add a `nav` to get a responsive sidebar (auto-collapses to a
 * menu button below 640 px, or always a button with `navPosition: "button"`).
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
 *   menu: () => S.button({ text: "New", attrs: ".small" }),
 *   content: () => drawPage(),
 *   footer: "© 2026",
 * });
 * ```
 */
export function main(opts: MainOptions = {}): void {
	const nav = opts.nav;
	const navPos = opts.navPosition ?? "left";
	const hasNav = nav != null && nav.items.length > 0;
	const navCls = hasNav ? (navPos === "button" ? ".s-nav-btn-only" : `.s-nav-${navPos}`) : "";

	A(`div.s-main.s-s.base${navCls}`, opts.attrs, () => {
		// Top bar.
		A(() => {
			const hasBar =
				opts.title != null ||
				opts.subtitle != null ||
				opts.icon != null ||
				opts.menu != null ||
				hasNav;
			if (!hasBar) return;
			A("header.s-s.raised", opts.topbarAttrs, () => {
				A("div.s-bar", () => {
					// Cap the bar's content to maxWidth and centre it within the full-width header.
					A(() => {
						if (opts.maxWidth != null) A("max-width:", opts.maxWidth);
					});
					// Nav trigger button — visible when sidebar is hidden (button mode or narrow viewport).
					A(() => {
						if (!hasNav) return;
						// .s-nav-trigger: CSS toggles display based on sidebar visibility.
						A("div.s-nav-trigger", () => {
							menuButton({
								...nav,
								button: {
									icon: () => A("span aria-hidden=true #☰"),
									ariaLabel: "Open navigation",
									attrs: ".neutral .outlined .small",
									...nav.button,
								},
							});
						});
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
						if (opts.menu) A("div.s-menu", () => opts.menu?.());
					});
				});
			});
		});

		// Body — wraps sidebar + separator + main when nav is in sidebar mode. The
		// trio together caps to maxWidth (via .s-body-inner); main fills the rest.
		if (hasNav && navPos !== "button") {
			A("div.s-body", () => {
				A("div.s-body-inner", () => {
					A(() => {
						if (opts.maxWidth != null) A("max-width:", opts.maxWidth);
					});
					A(`nav.s-nav-panel.s-s.raised.s-nav-${navPos}`, opts.navAttrs, () => {
						drawMenu(nav.items);
					});
					A("div.s-nav-sep aria-hidden=true");
					drawMainContent(opts, false);
				});
			});
		} else {
			drawMainContent(opts, true);
		}

		// Footer — full-width background, content centred to maxWidth via .s-bar.
		A(() => {
			if (opts.footer != null) {
				A("footer", () => {
					A("div.s-bar", () => {
						A(() => {
							if (opts.maxWidth != null) A("max-width:", opts.maxWidth);
						});
						drawSlot(opts.footer);
					});
				});
			}
		});
	});
}

/**
 * Draw the scrollable `<main>` + content area. When `capWidth` is true (no
 * sidebar), the content caps its own width to maxWidth and centres; in sidebar
 * mode the surrounding `.s-body-inner` already caps the sidebar+content trio.
 */
function drawMainContent(opts: MainOptions, capWidth: boolean): void {
	const mainEl = A("main", () => {
		A("div.s-content", opts.contentAttrs, () => {
			if (capWidth) {
				A(() => {
					if (opts.maxWidth != null) A("margin-inline:auto max-width:", opts.maxWidth);
				});
			}
			if (opts.content) opts.content();
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

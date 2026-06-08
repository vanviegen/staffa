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
	 * Max content width, e.g. `"60rem"`. When set, the content area caps its width
	 * and centres horizontally; otherwise it fills the available width. Either way
	 * it shares the page surface — it is not boxed.
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
		"> header": "display:flex align-items:center gap:$3 padding: $2 $3; border-bottom: 1px solid $s-border; position:sticky top:0 z-index:10",
		"> header .s-icon": "display:flex align-items:center font-size:1.4em",
		"> header .s-titles": "display:flex flex-direction:column min-width:0 flex:1",
		"> header .s-title": "font-weight:700 font-size:1.1em line-height:1.2 overflow:hidden text-overflow:ellipsis white-space:nowrap",
		"> header .s-subtitle": "fg:$s-fg-muted font-size:0.85em overflow:hidden text-overflow:ellipsis white-space:nowrap",
		"> header .s-menu": "display:flex align-items:center gap:$2",
		// Body holds sidebar + <main> side by side (only used when nav is present).
		".s-body": "flex:1 overflow:hidden display:flex flex-direction:row min-height:0",
		// Without nav, <main> is a direct child.
		"> main": "flex:1 overflow-y:auto display:flex flex-direction:column",
		// With nav, <main> is inside .s-body.
		".s-body > main": "flex:1 overflow-y:auto display:flex flex-direction:column",
		// The content area fills the scroll region with comfortable padding. With a
		// maxWidth it caps its width and centres (applied inline in drawMainContent).
		// It is deliberately NOT a boxed "sheet" — content brings its own boxes.
		"> main > .s-content, .s-body > main > .s-content": "width:100% flex:1 p:$3",
		"> footer": "display:flex align-items:center gap:$2 padding: $2 $3; border-top: 1px solid $s-border; fg:$s-fg-muted",
	},
	// Sidebar nav panel. Items reuse the shared `.s-menu-item[-link]` /
	// `.s-menu-sep` styles from menu.ts, so the sidebar and the floating
	// dropdown stay visually identical.
	".s-nav-panel": {
		"&": "display:flex flex-direction:column overflow-y:auto flex-shrink:0 w:220px p:$2 gap:$1",
		"&.s-nav-left": "border-right: 1px solid $s-border;",
		"&.s-nav-right": "border-left: 1px solid $s-border;",
	},
	// In button-only mode (or always-button navPosition), hide the sidebar and
	// show the trigger. In sidebar mode, show the panel and hide the trigger.
	// CSS @container queries handle the responsive collapse automatically.
	".s-main.s-nav-left .s-nav-trigger, .s-main.s-nav-right .s-nav-trigger": "display:none",
	".s-main.s-nav-btn-only .s-nav-panel": "display:none",
	".s-main.s-nav-btn-only .s-nav-trigger": "display:flex",
	// Collapse sidebar → button when shell is narrow.
	"@container (max-width: 640px)": {
		".s-main.s-nav-left .s-nav-panel, .s-main.s-nav-right .s-nav-panel": "display:none",
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
 *   menu: () => S.button({ text: "New", size: "sm" }),
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
								attrs: ".neutral .outlined",
								size: "sm",
								...nav.button,
							},
						});
					});
				});

				A(() => {
					if (opts.icon != null) A("div.s-icon", () => drawSlot(opts.icon));
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

		// Body — wraps sidebar + main when nav is in sidebar mode.
		if (hasNav && navPos !== "button") {
			A("div.s-body", () => {
				A(`nav.s-nav-panel.s-s.raised.s-nav-${navPos}`, opts.navAttrs, () => {
					drawMenu(nav.items);
				});
				drawMainContent(opts);
			});
		} else {
			drawMainContent(opts);
		}

		// Footer.
		A(() => {
			if (opts.footer != null) A("footer", () => drawSlot(opts.footer));
		});
	});
}

function drawMainContent(opts: MainOptions): void {
	A("main", () => {
		A("div.s-content", opts.contentAttrs, () => {
			A(() => {
				// With a maxWidth, cap the width and centre; otherwise fill the area.
				if (opts.maxWidth != null) A("margin-inline:auto max-width:", opts.maxWidth);
			});
			if (opts.content) opts.content();
		});
	});
}

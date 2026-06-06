import A from "aberdeen";
import { type Content, type Slot, type Attributes, drawSlot } from "../core.js";
import { type MenuOptions, type MenuEntry, type MenuItem, menu } from "./menu.js";

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
	 * Max content width. When set, the content is centered in a "sheet" with a
	 * drop shadow and a distinct surface, against the darker page background.
	 * e.g. `"60rem"`.
	 */
	maxWidth?: string;
	/** Aberdeen attr/style string applied to the content sheet. */
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
		"> main > .s-content, .s-body > main > .s-content": "width:100% flex:1",
		"> main > .s-content.s-framed, .s-body > main > .s-content.s-framed":
			"margin: $3 auto; border: 1px solid $s-border; r:$s-radius-lg box-shadow:$s-shadow p:$4",
		"> main > .s-content.s-plain, .s-body > main > .s-content.s-plain": "p:$3",
		"> footer": "display:flex align-items:center gap:$2 padding: $2 $3; border-top: 1px solid $s-border; fg:$s-fg-muted",
	},
	// Sidebar nav panel.
	".s-nav-panel": {
		"&": "display:flex flex-direction:column overflow-y:auto flex-shrink:0 w:220px p:$2 gap:$1",
		"&.s-nav-left": "border-right: 1px solid $s-border;",
		"&.s-nav-right": "border-left: 1px solid $s-border;",
	},
	".s-nav-item, a.s-nav-item": {
		"&":
			"display:flex align-items:center gap:$2 w:100% " +
			"padding: 0.5em 0.75em; r:$s-radius " +
			"font-size:0.92em border:0 background:transparent fg:$s-fg text-decoration:none text-align:left cursor:pointer " +
			"transition: background 0.12s;",
		"&:hover": "background: color-mix(in oklab, $s-fg, $s-bg 90%);",
		"&:focus-visible": "outline:none box-shadow: 0 0 0 3px $s-focus;",
		"&[aria-disabled=true]": "opacity:0.45 cursor:not-allowed",
		"&[aria-current=page]":
			"bg: color-mix(in oklab, $s-accent, $s-bg 80%); " +
			"fg:$s-accent font-weight:600",
		".s-nav-icon": "fg:$s-fg-muted flex-shrink:0",
		".s-nav-sep": "border:0 border-top: 1px solid $s-border; margin: $1 0;",
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
	},
});

/**
 * An application shell that wires up the things almost every app needs: a sticky
 * top bar (icon, title, subtitle, action menu), a scrollable content area, and a
 * footer. With {@link MainOptions.maxWidth} the content becomes a centered,
 * shadowed "sheet". Add a `nav` to get a responsive sidebar (auto-collapses to a
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
						menu({
							...nav,
							trigger: {
								icon: () => A("span aria-hidden=true #☰"),
								ariaLabel: "Open navigation",
								attrs: ".neutral .outlined",
								size: "sm",
								...nav.trigger,
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
				drawNavPanel(nav, navPos as "left" | "right", opts.navAttrs);
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

function drawNavPanel(nav: MenuOptions, side: "left" | "right", navAttrs?: Attributes): void {
	A(`nav.s-nav-panel.s-s.raised.s-nav-${side}`, navAttrs, () => {
		for (const entry of nav.items) {
			if ("separator" in entry) {
				A("hr.s-nav-sep");
				continue;
			}
			const tag = entry.href ? "a.s-nav-item" : "button.s-nav-item type=button";
			A(tag, entry.attrs, () => {
				if (entry.href) A("href=", entry.href);
				if (entry.target) A("target=", entry.target);
				if (entry.disabled) A("aria-disabled=true");
				if (entry.click) A("click=", entry.click);
				if (entry.icon) A("span.s-nav-icon", () => drawSlot(entry.icon));
				drawSlot(entry.label);
			});
		}
	});
}

function drawMainContent(opts: MainOptions): void {
	A("main", () => {
		A("div.s-content", opts.contentAttrs, () => {
			A(() => {
				const max = opts.maxWidth;
				if (max != null) A(".s-framed.s-s.panel max-width:", max);
				else A(".s-plain");
			});
			if (opts.content) opts.content();
		});
	});
}

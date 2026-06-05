import A from "aberdeen";
import { type BaseOptions, type Content, type Slot, type Styling, drawSlot } from "../core.js";

/** Options for {@link main}. */
export interface MainOptions extends BaseOptions {
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
	inner?: Styling;
	/** Aberdeen attr/style string applied to the top bar. */
	topbarInner?: Styling;
}

A.insertGlobalCss({
	".s-main": {
		"&": "display:flex flex-direction:column min-height:100vh max-height:100vh bg:$sBg fg:$sFg",
		"> header": "display:flex align-items:center gap:$3 padding: $2 $3; bg:$sSurfaceHi border-bottom: 1px solid $sBorder; position:sticky top:0 z-index:10",
		"> header .s-icon": "display:flex align-items:center font-size:1.4em",
		"> header .s-titles": "display:flex flex-direction:column min-width:0 flex:1",
		"> header .s-title": "font-weight:700 font-size:1.1em line-height:1.2 overflow:hidden text-overflow:ellipsis white-space:nowrap",
		"> header .s-subtitle": "fg:$sFgMuted font-size:0.85em overflow:hidden text-overflow:ellipsis white-space:nowrap",
		"> header .s-menu": "display:flex align-items:center gap:$2",
		"> main": "flex:1 overflow-y:auto display:flex flex-direction:column",
		"> main > .s-content": "width:100% flex:1",
		"> main > .s-content.s-framed": "margin: $3 auto; bg:$sSurface border: 1px solid $sBorder; r:$sRadiusLg box-shadow:$sShadow p:$4",
		"> main > .s-content.s-plain": "p:$3",
		"> footer": "display:flex align-items:center gap:$2 padding: $2 $3; bg:$sSurfaceHi border-top: 1px solid $sBorder; fg:$sFgMuted",
	},
});

/**
 * An application shell that wires up the things almost every app needs: a sticky
 * top bar (icon, title, subtitle, action menu), a scrollable content area, and a
 * footer. With {@link MainOptions.maxWidth} the content becomes a centered,
 * shadowed "sheet" — the common dashboard/document look — while staying fully
 * customisable via the various draw-function options and styling strings.
 *
 * @example
 * ```ts
 * S.main({
 *   icon: "✦",
 *   title: "Staffa Demo",
 *   subtitle: "Component playground",
 *   maxWidth: "56rem",
 *   menu: () => S.button({ text: "New", size: "sm" }),
 *   content: () => drawPage(),
 *   footer: "© 2026",
 * });
 * ```
 */
export function main(opts: MainOptions = {}): void {
	A("div.s-main", opts.root, () => {
		// Top bar — only rendered when there's something to show in it.
		A(() => {
			const hasBar = opts.title != null || opts.subtitle != null || opts.icon != null || opts.menu != null;
			if (!hasBar) return;
			A("header", opts.topbarInner, () => {
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

		// Scrollable main region with the (optionally framed) content sheet.
		A("main", () => {
			A("div.s-content", opts.inner, () => {
				// Framing applied in its own scope so changing maxWidth doesn't
				// recreate the content (which holds the whole page).
				A(() => {
					const max = opts.maxWidth;
					if (max != null) A(".s-framed max-width:", max);
					else A(".s-plain");
				});
				if (opts.content) opts.content();
			});
		});

		// Footer.
		A(() => {
			if (opts.footer != null) A("footer", () => drawSlot(opts.footer));
		});
	});
}

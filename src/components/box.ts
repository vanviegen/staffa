import A from "aberdeen";
import { type Content, type ContentOptions, type Slot, type Styling, drawSlot } from "../core.js";

/** Options for {@link box}. */
export interface BoxOptions extends ContentOptions {
	/** Header content, drawn in a styled bar above the body. */
	header?: Slot;
	/** Footer content, drawn in a styled bar below the body. */
	footer?: Slot;
	/** Aberdeen attr/style string applied to the header bar. */
	headerInner?: Styling;
	/** Aberdeen attr/style string applied to the footer bar. */
	footerInner?: Styling;
}

A.insertGlobalCss({
	".S_box": {
		"&": "display:flex flex-direction:column bg:$sSurface border: 1px solid $sBorder; r:$sRadius overflow:hidden",
		"> header": "display:flex align-items:center gap:$2 padding: $2 $3; bg:$sSurfaceHi border-bottom: 1px solid $sBorder; font-weight:600",
		"> footer": "display:flex align-items:center gap:$2 padding: $2 $3; bg:$sSurfaceHi border-top: 1px solid $sBorder;",
		// The body is the only plain <div> child; give it the default padding+gap.
		"> div": "p:$3 gap:$3",
	},
});

/**
 * A surface container — the workhorse layout primitive. Has an optional styled
 * header and footer, and a padded body that holds {@link ContentOptions.content}.
 *
 * The body gets default `padding` and matching `gap`; add `display:flex` via
 * {@link ContentOptions.inner | inner} if you want its children laid out as a
 * flex container.
 *
 * Shortcut: pass a function to use it directly as the body content.
 *
 * @example
 * ```ts
 * S.box({ header: "Profile", inner: "display:flex flex-direction:column", content: () => {
 *   S.textline({ label: "Name", bind: A.ref($user, "name") });
 * }});
 * S.box(() => A("p#Just some content"));   // shorthand
 * ```
 */
export function box(opts: BoxOptions | Content = {}): void {
	const o: BoxOptions = typeof opts === "function" ? { content: opts } : opts;

	A("section.S_box", o.root, () => {
		// Header and footer get their own scopes so toggling them doesn't recreate
		// the body (which may hold focused inputs / lots of content).
		A(() => {
			if (o.header != null) A("header", o.headerInner, () => drawSlot(o.header));
		});

		A("div", o.inner, () => {
			if (o.content) o.content();
		});

		A(() => {
			if (o.footer != null) A("footer", o.footerInner, () => drawSlot(o.footer));
		});
	});
}

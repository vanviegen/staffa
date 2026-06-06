import A from "aberdeen";
import { type Content, type ContentOptions, type Slot, type Attributes, drawSlot } from "../core.js";

/** Options for {@link box}. */
export interface BoxOptions extends ContentOptions {
	/** Header content, drawn in a styled bar above the body. */
	header?: Slot;
	/** Footer content, drawn in a styled bar below the body. */
	footer?: Slot;
	/** Aberdeen attr/style string applied to the body (content-holding) element. */
	contentAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the header bar. */
	headerAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the footer bar. */
	footerAttrs?: Attributes;
}

// The box itself is a `.panel` surface; its header/footer are `.raised`
// surfaces (classes set on the elements in `box()` below). Colours and borders
// come from the contextual tokens, so a box stays legible on whatever surface
// it's nested in.
A.insertGlobalCss({
	".s-box": {
		"&": "display:flex flex-direction:column border: 1px solid $s-border; r: $s-radius; overflow:hidden",
		"> header": "display:flex align-items:center gap:$2 padding: $2 $3; border-bottom: 1px solid $s-border; font-weight:600",
		"> footer": "display:flex align-items:center gap:$2 padding: $2 $3; border-top: 1px solid $s-border;",
		// The body is the only plain <div> child; give it the default padding+gap.
		"> div": "p:$3 gap:$3",
	},
});

/**
 * A surface container — the workhorse layout primitive. Has an optional styled
 * header and footer, and a padded body that holds {@link ContentOptions.content}.
 *
 * The body gets default `padding` and matching `gap`; add `display:flex` via
 * {@link BoxOptions.contentAttrs | contentAttrs} if you want its children laid
 * out as a flex container.
 *
 * Shortcut: pass a function to use it directly as the body content.
 *
 * @example
 * ```ts
 * S.box({ header: "Profile", contentAttrs: "display:flex flex-direction:column", content: () => {
 *   S.textline({ label: "Name", bind: A.ref($user, "name") });
 * }});
 * S.box(() => A("p#Just some content"));   // shorthand
 * ```
 */
export function box(opts: BoxOptions | Content = {}): void {
	const o: BoxOptions = typeof opts === "function" ? { content: opts } : opts;

	A("section.s-box.s-s.panel", o.attrs, () => {
		// Header and footer get their own scopes so toggling them doesn't recreate
		// the body (which may hold focused inputs / lots of content).
		A(() => {
			if (o.header != null) A("header.s-s.raised", o.headerAttrs, () => drawSlot(o.header));
		});

		A("div", o.contentAttrs, () => {
			if (o.content) o.content();
		});

		A(() => {
			if (o.footer != null) A("footer.s-s.raised", o.footerAttrs, () => drawSlot(o.footer));
		});
	});
}

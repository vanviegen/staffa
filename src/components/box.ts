import A from "aberdeen";
import { type ContentOptions, type Slot, type Attributes, drawSlot } from "../core.js";

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

// The box itself is a `.neutral` surface; its header/footer are `.neutral` surfaces
// too — nested one level deeper, so they pick up the next elevation shade
// automatically. Colours and borders come from the contextual tokens, so a box
// stays legible on whatever surface it's nested in.
// The box is just a `.s-s.neutral.shadow` surface: its border and shadow come from
// the surface itself (see theme.ts), not from here. `.s-box` only does layout and
// the header/footer dividers. Header/footer are `.neutral` surfaces too (one level
// deeper, for the raised shade), so we cancel their full surface border down to a
// single divider.
A.insertGlobalCss({
	".s-box": {
		"&": "display:flex flex-direction:column overflow:hidden r: $s-radius-lg;",
		"&:not(:first-child)": "margin-top: $3",
		"> header": "display:flex align-items:center gap:$2 padding: $2 $3; border:0 border-bottom: 1px solid $s-faint; r:0 font-weight:600",
		"> footer": "display:flex align-items:center justify-content:flex-end gap:$2 padding: $2 $3; border:0 border-top: 1px solid $s-faint; r:0",
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
 * const $user = A.proxy({name: "Kvothe"});
 * S.box({ header: "Profile", contentAttrs: "display:flex flex-direction:column", content: () => {
 *   S.textline({ label: "Name", bind: A.ref($user, "name") });
 * }});
 * S.box(() => A("p#Just some content"));   // shorthand
 * ```
 */
export function box(opts: BoxOptions | Slot = {}): void {
	const o: BoxOptions = typeof opts === "string" || typeof opts === "function" ? { content: opts } : opts;

	A("section.s-box.s-s.neutral.shadow", o.attrs, () => {
		// Header and footer get their own scopes so toggling them doesn't recreate
		// the body (which may hold focused inputs / lots of content).
		A(() => {
			if (o.header != null) A("header.s-s.neutral", o.headerAttrs, () => drawSlot(o.header));
		});

		A("div", o.contentAttrs, () => {
			drawSlot(o.content);
		});

		A(() => {
			if (o.footer != null) A("footer.s-s.neutral", o.footerAttrs, () => drawSlot(o.footer));
		});
	});
}

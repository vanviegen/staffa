import A from "aberdeen";
import { type ContentOptions, type Slot, type Attributes, drawSlot } from "../core.js";
import { x as closeIcon } from "../icons.js";
import { iconButton } from "./button.js";

/** Options for {@link box}. */
export interface BoxOptions extends ContentOptions {
	/** Header content, drawn in a styled bar above the body. */
	header?: Slot;
	/** Footer content, drawn in a styled bar below the body. */
	footer?: Slot;
	/**
	 * Draws a small ✕ button in the box's top-right corner — in the header row when
	 * there is a {@link BoxOptions.header | header}, floating over the body when
	 * there isn't — and runs this when it's clicked.
	 *
	 * It is plain furniture: a box that happens to sit in a page of a routed
	 * `S.main()` does **not** close that page — the shell's breadcrumbs are the
	 * way out of those. Wire it to `$panel.close()` yourself if a box really is
	 * the whole page and wants its own ✕.
	 */
	close?: () => void;
	/** Aberdeen attr/style string applied to the body (content-holding) element. */
	contentAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the header bar. */
	headerAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the footer bar. */
	footerAttrs?: Attributes;
}

// Colours, border and shadow come from the `.s-s.neutral.shadow` surface itself
// (see theme.ts); `.s-box` only does layout. Header/footer are `.neutral` surfaces
// one level deeper (for the raised shade), with their surface border cancelled
// down to a single divider.
A.insertGlobalCss({
	".s-box": {
		// position:relative so a headerless box can hang its ✕ in the corner.
		"&": "display:flex flex-direction:column overflow:hidden r: $s-radius-lg; position:relative",
		"&:not(:first-child)": "margin-top: $3",
		"> header": "display:flex align-items:center gap:$2 padding: $2 $3; border:0 border-bottom: 1px solid $s-faint; r:0 font-weight:600",
		"> footer": "display:flex align-items:center justify-content:flex-end gap:$2 padding: $2 $3; border:0 border-top: 1px solid $s-faint; r:0",
		"> div": "p:$3 gap:$3",
		// The ✕ parks at the end of a header row, or floats over the body when there is none.
		"> header > .s-box-close": "margin-left:auto",
		"> .s-box-close": "position:absolute top:$2 right:$2 z-index:1",
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
 * S.box({ header: "Draft", close: () => discard(), content: drawDraft });  // ✕ runs discard()
 * ```
 */
export function box(opts: BoxOptions | Slot = {}): void {
	const o: BoxOptions = typeof opts === "string" || typeof opts === "function" ? { content: opts } : opts;

	A("section.s-box.s-s.neutral.shadow", o.attrs, () => {
		// Header and footer get their own scopes, so toggling them doesn't recreate
		// the body (which may hold focused inputs).
		A(() => {
			// typeof-guarded: v0.9's removed `close: true`, reaching us from unchecked
			// JS, would otherwise render a ✕ that does nothing.
			if (o.header != null) {
				A("header.s-s.neutral", o.headerAttrs, () => {
					drawSlot(o.header);
					if (typeof o.close === "function") drawCloseButton(o.close);
				});
			} else if (typeof o.close === "function") {
				drawCloseButton(o.close);
			}
		});

		A("div", o.contentAttrs, () => {
			drawSlot(o.content);
		});

		A(() => {
			if (o.footer != null) A("footer.s-s.neutral", o.footerAttrs, () => drawSlot(o.footer));
		});
	});
}

/**
 * The box's ✕: one definition, so it is identical in a header row and floating
 * over a headerless body. `.s-box-close` is only a hook for the placement rules.
 */
function drawCloseButton(close: () => void): void {
	iconButton({
		icon: closeIcon,
		ariaLabel: "Close",
		click: close,
		attrs: ".s-box-close",
	});
}

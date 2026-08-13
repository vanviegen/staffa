import A from "aberdeen";
import { type ContentOptions, type Slot, type Attributes, drawSlot } from "../core.js";
import { closeContainingPanel } from "./panels.js";

/** Options for {@link box}. */
export interface BoxOptions extends ContentOptions {
	/** Header content, drawn in a styled bar above the body. */
	header?: Slot;
	/** Footer content, drawn in a styled bar below the body. */
	footer?: Slot;
	/**
	 * Draws a small ✕ button in the box's top-right corner: in the header row when
	 * there is a {@link BoxOptions.header | header}, floating over the body when
	 * there isn't.
	 *
	 * `true` closes the panel the box is drawn in, which is how a screen of a
	 * routed `S.main()` gives the user a way back (the shell draws no back
	 * arrows or ✕ of its own). Which panel that is gets worked out from the DOM
	 * when it's clicked, so the box needs no `$page` handed to it and works from
	 * any column, top of the stack or not. A box in a column further left closes
	 * just that column and leaves the others alone. Outside a routed shell it
	 * does nothing but warn.
	 *
	 * Pass a function to run that instead, for a dismissal of your own.
	 */
	close?: boolean | (() => void);
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
		// position:relative so a headerless box can hang its ✕ in the corner.
		"&": "display:flex flex-direction:column overflow:hidden r: $s-radius-lg; position:relative",
		"&:not(:first-child)": "margin-top: $3",
		"> header": "display:flex align-items:center gap:$2 padding: $2 $3; border:0 border-bottom: 1px solid $s-faint; r:0 font-weight:600",
		"> footer": "display:flex align-items:center justify-content:flex-end gap:$2 padding: $2 $3; border:0 border-top: 1px solid $s-faint; r:0",
		"> div": "p:$3 gap:$3",
		// The ✕: quiet until you're near it, and drawn in the surface's own tokens
		// so it works on whatever the box was recoloured to. `margin-left:auto`
		// parks it at the far end of the header's flex row.
		".s-box-close":
			"flex-shrink:0 margin-left:auto display:flex align-items:center justify-content:center " +
			"width:1.6rem height:1.6rem p:0 border:0 background:transparent cursor:pointer " +
			"fg:$s-muted font-size:0.95rem line-height:1 r:$s-radius-sm " +
			"transition: color 0.12s, background 0.12s;",
		".s-box-close:hover": "fg:$s-text background: color-mix(in srgb, $s-text 8%, transparent);",
		// Without a header there is no row to sit in, so it floats over the body.
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
 * {@link BoxOptions.close | `close: true`} adds a ✕ that closes the panel the box
 * is drawn in: the usual way back out of a screen in a routed `S.main()`.
 *
 * @example
 * ```ts
 * const $user = A.proxy({name: "Kvothe"});
 * S.box({ header: "Profile", contentAttrs: "display:flex flex-direction:column", content: () => {
 *   S.textline({ label: "Name", bind: A.ref($user, "name") });
 * }});
 * S.box(() => A("p#Just some content"));   // shorthand
 * S.box({ header: "Task 42", close: true, content: drawTask });  // ✕ closes this panel
 * ```
 */
export function box(opts: BoxOptions | Slot = {}): void {
	const o: BoxOptions = typeof opts === "string" || typeof opts === "function" ? { content: opts } : opts;

	A("section.s-box.s-s.neutral.shadow", o.attrs, () => {
		// Header and footer get their own scopes so toggling them doesn't recreate
		// the body (which may hold focused inputs / lots of content).
		A(() => {
			if (o.header != null) {
				A("header.s-s.neutral", o.headerAttrs, () => {
					drawSlot(o.header);
					if (o.close) drawCloseButton(o.close);
				});
			} else if (o.close) {
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
 * The box's ✕. With `close: true` the panel to close is resolved from the DOM at
 * click time — so one box can close whichever column it happens to be drawn in,
 * and a box outside a routed shell simply warns.
 */
function drawCloseButton(close: boolean | (() => void)): void {
	A("button.s-box-close type=button aria-label=Close", () => {
		A("click=", (e: Event) => {
			if (typeof close === "function") close();
			else void closeContainingPanel(e.currentTarget as HTMLElement);
		});
		A("span aria-hidden=true #✕");
	});
}

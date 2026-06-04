import A from "aberdeen";
import { type Slot, type Styling, drawSlot } from "../core.js";

/** Options for {@link modal}. */
export interface ModalOptions {
	/** Slot rendered in the styled header bar. */
	header?: Slot;
	/** Slot rendered in the styled footer bar. */
	footer?: Slot;
	/** Aberdeen attr/style string applied to the header bar. */
	headerInner?: Styling;
	/** Aberdeen attr/style string applied to the footer bar. */
	footerInner?: Styling;
	/** Aberdeen attr/style string applied to the scrollable content `<div>`. */
	inner?: Styling;
	/** Aberdeen attr/style string applied to the modal panel itself. */
	root?: Styling;
	/**
	 * Allow closing via Esc or clicking the backdrop. Defaults to `true`.
	 * May be changed on a proxied options object while the modal is open
	 * (e.g. lock when form data is dirty).
	 */
	allowCancel?: boolean;
	/**
	 * Modal body. Receives a `close()` function — call it to dismiss the modal
	 * programmatically.
	 */
	content?: (close: () => void) => void;
}

// Transition helper classes.
// `.S_m_bd_anim` = backdrop start/end state (opacity 0).
// `.S_m_box_anim` = modal box start/end state (opacity 0, slightly lower).
A.insertGlobalCss({
	".S_backdrop": {
		"&": "position:fixed inset:0 z-index:200; background: rgba(0,0,0,0.55); transition: opacity 0.2s ease;",
		"&:not(:has(~ .S_backdrop))": "display:block",
		"&:not(:has(~ .S_backdrop)) + .S_modal": "display:flex flex-direction:column",
		// Transition states: applied momentarily on create; re-applied on destroy.
		"&.hidden": "opacity:0 pointer-events:none",
	},
	".S_modal": {
		"&":
			"position:fixed z-index:201 top:50% left:50% " +
			"transform:translate(-50%,-50%) " +
			"min-width:20rem max-width:min(90vw,44rem) max-height:min(88vh,800px) " +
			"bg:$sSurface border: 1px solid $sBorder; r:$sRadiusLg box-shadow:$sShadow overflow:hidden " +
			"transition: opacity 0.2s ease, transform 0.2s ease;",
		// Header and footer are fixed; only the content <div> scrolls.
		"> header":
			"display:flex align-items:center gap:$2 padding: $2 $3; " +
			"bg:$sSurfaceHi border-bottom: 1px solid $sBorder; font-weight:600 flex-shrink:0",
		"> footer":
			"display:flex align-items:center gap:$2 padding: $2 $3; " +
			"bg:$sSurfaceHi border-top: 1px solid $sBorder; flex-shrink:0",
		"> div": "p:$3 gap:$3 display:flex flex-direction:column overflow-y:auto flex:1 min-height:0",
		"&.hidden": "opacity:0 pointer-events:none transform: translate(-50%, calc(-50% + 20px));",
	},
});

/**
 * A modal dialog rendered into `document.body` via `A.mount`, with a dimming
 * backdrop that fades in and out. Lifecycle is tied to the parent reactive scope —
 * when the scope that called `modal()` is cleaned up the modal disappears.
 *
 * Only the **last** open modal (and its backdrop) is visible; earlier pairs are
 * hidden via the CSS `+` selector, so nested modals stack correctly.
 *
 * The header and footer are pinned; only the body content scrolls when it is
 * taller than `88vh`.
 *
 * @example
 * ```ts
 * S.modal({
 *   header: "Confirm",
 *   allowCancel: true,
 *   content: (close) => {
 *     A("p #Are you sure?");
 *     S.button({ text: "Yes", click: () => { doIt(); close(); } });
 *     S.button({ text: "Cancel", variant: "outlined", click: close });
 *   },
 * });
 * ```
 */
export function modal(opts: ModalOptions): void {
	const $closed = A.proxy(false);
	const close = () => { $closed.value = true; };

	// A.mount ties this scope to the calling reactive scope — when the parent
	// scope is torn down, the backdrop and modal are removed from body too.
	A.mount(document.body, () => {
		// The 'peek' is there such that when 'closed' is first set, this scope doesn't need to watch anything anymore.
		if (A.peek($closed, 'value'), $closed.value) return;

		// Global Esc listener — registered here so it's removed on close.
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && opts.allowCancel !== false) close();
		};
		document.addEventListener("keydown", onKey);
		A.clean(() => document.removeEventListener("keydown", onKey));

		// Backdrop: fades in on creation, fades out on removal.
		A("div.S_backdrop create=hidden destroy=hidden", () => {
			A("click=", () => {
				if (opts.allowCancel !== false) close();
			});
		});

		// Modal panel: fades + slides in/out.
		A("div.S_modal create=hidden destroy=hidden", opts.root, () => {
			A(() => {
				if (opts.header != null) {
					A("header", opts.headerInner, () => drawSlot(opts.header));
				}
			});

			A("div", opts.inner, () => {
				if (opts.content) opts.content(close);
			});

			A(() => {
				if (opts.footer != null) {
					A("footer", opts.footerInner, () => drawSlot(opts.footer));
				}
			});
		});
	});
}

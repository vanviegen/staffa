import A from "aberdeen";
import { type Slot, type Styling, drawSlot } from "../core.js";
import { button } from "./button.js";
import { buttonGroup } from "./buttonGroup.js";
import { textline } from "./textline.js";

/** Options for {@link dialog}. */
export interface DialogOptions {
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
	/** Aberdeen attr/style string applied to the dialog panel itself. */
	root?: Styling;
	/**
	 * Allow closing via Esc or clicking the backdrop. Defaults to `true`.
	 * May be changed on a proxied options object while the dialog is open
	 * (e.g. lock when form data is dirty).
	 */
	allowCancel?: boolean;
	/**
	 * Dialog body. Receives a `close()` function — call it to dismiss the dialog
	 * programmatically.
	 */
	content?: (close: () => void) => void;
	/**
	 * Called when the dialog closes for any reason (explicit `close()`, Esc, or
	 * backdrop click). Useful when you want a side-effect on close but don't need
	 * the Promise returned by {@link dialog}.
	 */
	onClose?: () => void;
}

// Transition helper classes.
// `.s-backdrop` = backdrop, hidden when another backdrop follows it in the DOM.
// `.s-dialog`   = dialog box, slides + fades in/out.
A.insertGlobalCss({
	".s-backdrop": {
		"&": "position:fixed inset:0 z-index:200; background: rgba(0,0,0,0.55); transition: opacity 0.2s ease;",
		"&:not(:has(~ .s-backdrop))": "display:block",
		"&:not(:has(~ .s-backdrop)) + .s-dialog": "display:flex flex-direction:column",
		// Transition states: applied momentarily on create; re-applied on destroy.
		"&.hidden": "opacity:0 pointer-events:none",
	},
	".s-dialog": {
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
		"&.hidden *": "pointer-events:none",
	},
});

/**
 * A dialog rendered into `document.body` via `A.mount`, with a dimming backdrop
 * that fades in and out. Returns a `Promise<void>` that resolves when the dialog
 * closes. Lifecycle is also tied to the parent reactive scope — when that scope
 * is cleaned up the dialog disappears and the promise resolves.
 *
 * Only the **last** open dialog (and its backdrop) is visible; earlier pairs are
 * hidden via the CSS `+` selector, so nested dialogs stack correctly.
 *
 * The header and footer are pinned; only the body content scrolls when it is
 * taller than `88vh`.
 *
 * @example
 * ```ts
 * S.dialog({
 *   header: "Confirm",
 *   content: (close) => {
 *     A("p #Are you sure?");
 *     S.button({ text: "Yes", click: () => { doIt(); close(); } });
 *     S.button({ text: "Cancel", variant: "outlined", click: close });
 *   },
 * });
 * ```
 */
export function dialog(opts: DialogOptions): Promise<void> {
	return new Promise<void>((resolve) => {
		const $closed = A.proxy(false);
		const close = () => { $closed.value = true; };

		let resolved = false;
		const onDone = () => {
			if (resolved) return;
			resolved = true;
			opts.onClose?.();
			resolve();
		};

		// A.mount ties this scope to the calling reactive scope — when the parent
		// scope is torn down, the backdrop and dialog are removed from body too.
		A.mount(document.body, () => {
			// The 'peek' is there such that when 'closed' is first set, this scope doesn't need to watch anything anymore.
			if (A.peek($closed, "value"), $closed.value) return;

			// Global Esc listener — registered here so it's removed on close.
			const onKey = (e: KeyboardEvent) => {
				if (e.key === "Escape" && opts.allowCancel !== false) close();
			};
			document.addEventListener("keydown", onKey);
			A.clean(() => {
				document.removeEventListener("keydown", onKey);
				// Fires when this render is torn down — either because $closed became
				// true (normal close) or because the parent reactive scope was cleaned up.
				onDone();
			});

			// Backdrop: fades in on creation, fades out on removal.
			A("div.s-backdrop create=hidden destroy=hidden", () => {
				A("click=", () => {
					if (opts.allowCancel !== false) close();
				});
			});

			// Dialog panel: fades + slides in/out.
			A("div.s-dialog create=hidden destroy=hidden", opts.root, () => {
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
	});
}

/**
 * Shows a message dialog with a single OK button. Returns a `Promise<void>`
 * that resolves when the user dismisses it.
 *
 * All properties of `opts` override the defaults, including `content`.
 *
 * @example
 * ```ts
 * await S.alert("File saved successfully.");
 * ```
 */
export function alert(message: string, opts: Partial<DialogOptions> = {}): Promise<void> {
	return dialog({
		header: "Alert",
		allowCancel: true,
		content: (close) => {
			A("p", () => { A("#", message); });
			buttonGroup({ layout: "spaced", root: "align-self:flex-end", content: () => {
				button({ text: "OK", click: close });
			}});
		},
		...opts,
	});
}

/**
 * Shows a confirmation dialog with Cancel and OK buttons. Returns a
 * `Promise<boolean>` — `true` if the user clicked OK, `false` otherwise
 * (including Esc / backdrop click when `allowCancel` is not `false`).
 *
 * All properties of `opts` override the defaults, including `content`.
 *
 * @example
 * ```ts
 * if (await S.confirm("Delete this item?")) deleteItem();
 * ```
 */
export function confirm(message: string, opts: Partial<DialogOptions> = {}): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		let confirmed = false;
		dialog({
			header: "Confirm",
			allowCancel: true,
			content: (close) => {
				A("p", () => { A("#", message); });
				buttonGroup({ layout: "spaced", root: "align-self:flex-end", content: () => {
					button({ text: "Cancel", variant: "outlined", color: "neutral", click: close });
					button({ text: "OK", click: () => { confirmed = true; close(); } });
				}});
			},
			...opts,
			onClose: () => {
				resolve(confirmed);
				opts.onClose?.();
			},
		});
	});
}

/**
 * Shows a prompt dialog with a text input. Returns a `Promise<string | null>` —
 * the entered string if the user confirmed, or `null` if cancelled (Esc /
 * backdrop click / Cancel button).
 *
 * All properties of `opts` override the defaults, including `content`.
 *
 * @example
 * ```ts
 * const name = await S.prompt("Enter your name:", "Alice");
 * if (name !== null) greet(name);
 * ```
 */
export function prompt(message: string, defaultValue = "", opts: Partial<DialogOptions> = {}): Promise<string | null> {
	return new Promise<string | null>((resolve) => {
		let result: string | null = null;
		dialog({
			header: "Input",
			allowCancel: true,
			content: (close) => {
				A("p", () => { A("#", message); });
				const $v = A.proxy({ value: defaultValue });
				// Wrap in a form so Enter submits; display:contents keeps flex layout intact.
				A("form display:contents", () => {
					A("submit=", (e: Event) => {
						e.preventDefault();
						result = $v.value;
						close();
					});
					textline({ bind: A.ref($v, "value") });
					buttonGroup({ layout: "spaced", root: "align-self:flex-end", content: () => {
						button({ text: "Cancel", variant: "outlined", color: "neutral", type: "button", click: close });
						button({ text: "OK", type: "submit" });
					}});
				});
			},
			...opts,
			onClose: () => {
				resolve(result);
				opts.onClose?.();
			},
		});
	});
}

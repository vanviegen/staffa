import A from "aberdeen";
import { type Slot, type Attributes, drawSlot } from "../core.js";
import { button } from "./button.js";
import { buttonGroup } from "./buttonGroup.js";
import { textline } from "./textline.js";

/** Options for {@link dialog}. */
export interface DialogOptions {
	/** Slot rendered in the styled header bar. */
	header?: Slot;
	/** Slot rendered in the styled footer bar. */
	footer?: Slot;
	/** Aberdeen attr/style string applied to the dialog panel. A surface — pass modifier classes (e.g. `".warning"`) to recolour it. */
	attrs?: Attributes;
	/** Aberdeen attr/style string applied to the header bar. */
	headerAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the footer bar. */
	footerAttrs?: Attributes;
	/** Aberdeen attr/style string applied to the scrollable content `<div>`. */
	contentAttrs?: Attributes;
	/**
	 * Allow closing via Esc or clicking the backdrop. Defaults to `true`.
	 * May be changed on a proxied options object while the dialog is open
	 * (e.g. lock when form data is dirty).
	 */
	allowCancel?: boolean;
	/**
	 * When set to `true` (default) the model will be destroyed when the `dialog()`-calling
	 * scope is destroyed.
	 */
	cancelWithScope?: boolean;
	/**
	 * Dialog body. A {@link Slot} whose draw-function receives a `close()` function
	 * — call it to dismiss the dialog programmatically. (A plain string renders as
	 * rich text.)
	 */
	content?: Slot<[close: () => void]>;
	/**
	 * Called when the dialog closes for any reason (explicit `close()`, Esc, or
	 * backdrop click). Useful when you want a side-effect on close but don't need
	 * the Promise returned by {@link dialog}.
	 */
	onClose?: () => void;
}

A.insertGlobalCss({
	".s-backdrop": {
		"&": "position:fixed inset:0 z-index:200 display:block background: rgba(0,0,0,0.55); transition: opacity 0.4s ease-in-out;",
		"&.hidden": "opacity:0 pointer-events:none",
	},
	".s-dialog": {
		"&":
			"position:fixed z-index:200 top:50% left:50% " +
			"display:flex flex-direction:column " +
			"transform:translate(-50%,-50%) " +
			"min-width:20rem max-width:min(90vw,44rem) max-height:min(88vh,800px) " +
			"border: 1px solid $s-border; r: $s-radius-lg; box-shadow: $s-shadow; overflow:hidden " +
			"transition: opacity 0.2s ease-out, transform 0.2s ease-out;",
		"> header":
			"display:flex align-items:center gap:$2 padding: $2 $3; " +
			"border-bottom: 1px solid $s-border; font-weight:600 flex-shrink:0",
		"> footer":
			"display:flex align-items:center gap:$2 padding: $2 $3; " +
			"border-top: 1px solid $s-border; flex-shrink:0",
		"> div": "p:$3 gap:$3 display:flex flex-direction:column overflow-y:auto flex:1 min-height:0",
		"&.hidden": "opacity:0 pointer-events:none transform: translate(-50%, calc(-50% + 20px)); pointer-events:none",
	},
});

const dialogs = A.proxy({} as Record<number,{resolve: (value: void | PromiseLike<void>) => void, opts: DialogOptions}>);
let dialogCount = 0;

const topDialogId = A.derive(() => {
	const keys = Object.keys(dialogs);
	if (keys.length) return keys[keys.length-1];
});

A.mount(document.body, () => {
	A.onEach(dialogs, ({resolve, opts}, dialogId) => {
		const close = () => { delete dialogs[dialogId]; };

		A.clean(() => {
			// Fires when this render is torn down — either because $closed became
			// true (normal close) or because the parent reactive scope was cleaned up.
			opts.onClose?.();
			resolve();
		});

		// Backdrop - hide when not the top dialog
		const overlaid = A.derive(() => topDialogId.value != dialogId);
		A("div.s-backdrop create=hidden destroy=hidden .hidden=", overlaid, "click=", () => {
			if (opts.allowCancel !== false) close();
		});

		// Dialog itself
		A("div.s-dialog.s-s.panel create=hidden destroy=hidden", opts.attrs, () => {
			A(() => {
				if (opts.header != null) {
					A("header.s-s.raised", opts.headerAttrs, () => drawSlot(opts.header));
				}
			});

			A("div", opts.contentAttrs, () => {
				drawSlot(opts.content, close);
			});

			A(() => {
				if (opts.footer != null) {
					A("footer.s-s.raised", opts.footerAttrs, () => drawSlot(opts.footer));
				}
			});
		});
	});
})

/**
 * A dialog rendered into `document.body` via `A.mount`, with a dimming backdrop
 * that fades in and out. Returns a `Promise<void>` that resolves when the dialog
 * closes. Lifecycle is also tied to the parent reactive scope — when that scope
 * is cleaned up the dialog disappears and the promise resolves.
 *
 * Multiple dialogs stack correctly: each new pair (backdrop + dialog) has a
 * higher z-index, while older dialogs are pushed behind their covering backdrop.
 *
 * @example
 * ```ts
 * S.dialog({
 *   header: "Confirm",
 *   content: (close) => {
 *     A("p #Are you sure?");
 *     S.button({ text: "Yes", click: () => { doIt(); close(); } });
 *     S.button({ text: "Cancel", attrs: ".neutral .outlined", click: close });
 *   },
 * });
 * ```
 */
export function dialog(opts: DialogOptions): Promise<void> {
	if (!dialogCount) {
		// Install Esc handler the first time we create a dialog
		document.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Escape" && opts.allowCancel !== false) {
				const ds = A.unproxy(dialogs);
				// Search for top-most dialog
				for(let i=dialogCount; i>0; i--) {
					if (ds[i]) {
						if (ds[i].opts.allowCancel !== false) {
							// The clean handler should call resolve and onClose
							delete dialogs[i];
						}
						break;
					}
				}
			}
		});
	}
	const dialogId = ++dialogCount;
	if (opts.cancelWithScope !== false) A.clean(() => { delete dialogs[dialogId]; });
	return new Promise<void>((resolve) => {
		dialogs[dialogId] = {resolve, opts};
	});
}

/**
 * Shows a message dialog with a single OK button. Returns a `Promise<void>`
 * that resolves when the user dismisses it.
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
			buttonGroup({ layout: "spaced", attrs: "align-self:flex-end", content: () => {
				button({ text: "OK", click: close });
			}});
		},
		...opts,
	});
}

/**
 * Shows a confirmation dialog with Cancel and OK buttons. Returns a
 * `Promise<boolean>` — `true` if the user clicked OK, `false` otherwise.
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
				buttonGroup({ layout: "spaced", attrs: "align-self:flex-end", content: () => {
					button({ text: "Cancel", attrs: ".neutral .outlined", click: close });
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
 * the entered string if the user confirmed, or `null` if cancelled.
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
				A("form display:contents", () => {
					A("submit=", (e: Event) => {
						e.preventDefault();
						result = $v.value;
						close();
					});
					textline({ bind: A.ref($v, "value") });
					buttonGroup({ layout: "spaced", attrs: "align-self:flex-end", content: () => {
						button({ text: "Cancel", attrs: ".neutral .outlined", type: "button", click: close });
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

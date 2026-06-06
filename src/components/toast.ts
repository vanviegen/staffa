import A from "aberdeen";
import { type Slot, type Attributes, drawSlot } from "../core.js";
import type { SurfaceRole } from "../theme.js";

/** Options for {@link toast}. */
export interface ToastOptions {
	/** Primary message. A string is rendered as rich text. */
	message: Slot;
	/** Optional bold title above the message. */
	title?: Slot;
	/**
	 * Colour role. Defaults to `"neutral"`.
	 * Use `"success"` / `"danger"` / `"warning"` for semantic feedback.
	 */
	type?: SurfaceRole;
	/**
	 * Auto-dismiss delay in milliseconds. Defaults to `4000`.
	 * Pass `0` to make the toast persistent until dismissed manually.
	 */
	duration?: number;
	/** Show a close button. Defaults to `true`. */
	dismissible?: boolean;
	/** Aberdeen attr/style string applied to the toast element. */
	attrs?: Attributes;
}

interface ToastEntry {
	id: number;
	opts: ToastOptions;
}

A.insertGlobalCss({
	".s-toasts":
		"position:fixed bottom:$3 right:$3 z-index:400 " +
		"display:flex flex-direction:column-reverse gap:$2 " +
		"pointer-events:none max-width:min(90vw,24rem) w:24rem",
	".s-toast": {
		"&":
			"display:flex align-items:flex-start gap:$2 " +
			"p:$3 border: 1px solid $s-border; r:$s-radius box-shadow:$s-shadow " +
			"pointer-events:auto " +
			"transition: opacity 0.2s ease-out, transform 0.2s ease-out;",
		"&.hidden": "opacity:0 transform:translateX(100%) pointer-events:none",
		".s-toast-body": "display:flex flex-direction:column gap:$1 flex:1 min-width:0",
		".s-toast-title": "font-weight:700 line-height:1.3",
		".s-toast-msg": "font-size:0.9em fg:$s-fg-muted line-height:1.4",
		".s-toast-close":
			"cursor:pointer border:0 background:transparent fg:$s-fg-muted font-size:1.1em line-height:1 " +
			"padding: 0 0.15em; r:4px flex-shrink:0 align-self:flex-start",
		".s-toast-close:hover": "fg:$s-fg",
		".s-toast-close:focus-visible": "outline:none box-shadow: 0 0 0 3px $s-focus;",
	},
});

let toastCount = 0;
const toasts = A.proxy([] as ToastEntry[]);

A.mount(document.body, () => {
	A("div.s-toasts aria-live=polite aria-atomic=false", () => {
		A.onEach(toasts, (entry) => {
			const { opts } = entry;
			const role = opts.type === "danger" || opts.type === "warning" ? "alert" : "status";
			const surface = opts.type ?? "neutral";

			A(
				`div.s-toast.s-s.${surface} create=hidden destroy=hidden role=${role}`,
				opts.attrs,
				() => {
					A("div.s-toast-body", () => {
						A(() => {
							if (opts.title != null) A("div.s-toast-title", () => drawSlot(opts.title));
						});
						A("div.s-toast-msg", () => drawSlot(opts.message));
					});
					A(() => {
						if (opts.dismissible === false) return;
						A("button.s-toast-close type=button aria-label=Dismiss", () => {
							A("#×");
							A("click=", () => dismiss(entry.id));
						});
					});
				},
			);
		});
	});
});

function dismiss(id: number): void {
	const idx = toasts.findIndex((t) => t.id === id);
	if (idx !== -1) toasts.splice(idx, 1);
}

/**
 * Show a toast notification. Returns a `dismiss()` function to remove it
 * programmatically. Auto-dismisses after `duration` ms (default 4 000).
 *
 * @example
 * ```ts
 * S.toast({ message: "Saved!", type: "success" });
 * S.toast({ title: "Error", message: "Upload failed.", type: "danger", duration: 0 });
 * const off = S.toast({ message: "Uploading…", duration: 0, dismissible: false });
 * // later:
 * off();
 * ```
 */
export function toast(opts: ToastOptions): () => void {
	const id = ++toastCount;
	toasts.push({ id, opts });

	const duration = opts.duration ?? 4000;
	let timer: ReturnType<typeof setTimeout> | undefined;
	if (duration > 0) {
		timer = setTimeout(() => dismiss(id), duration);
	}

	return () => {
		if (timer != null) clearTimeout(timer);
		dismiss(id);
	};
}

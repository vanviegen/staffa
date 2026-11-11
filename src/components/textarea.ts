import A from "aberdeen";
import type { Bindable } from "../core.js";
import { type FieldOptions, type InsetOptions, applyControlAttrs, drawField, drawInsets } from "./field.js";

/** Options for {@link textarea}. */
export interface TextareaOptions extends FieldOptions, InsetOptions {
	/** Placeholder text. */
	placeholder?: string;
	/** Two-way binding target. */
	bind?: Bindable<string>;
	/** Static initial value. */
	value?: string;
	/** Visible number of text rows. Defaults to `4`. Ignored when `autoGrow` is enabled. */
	rows?: number;
	/**
	 * Whether the textarea may be resized by the user. Defaults to `"vertical"`,
	 * or to `"none"` when a {@link InsetOptions.suffix | suffix} is given — the
	 * resize grip and the inset both want the bottom-right corner. Ignored when
	 * `autoGrow` is enabled.
	 */
	resize?: "none" | "vertical" | "horizontal" | "both";
	/**
	 * Auto-grow the textarea to fit its content. Defaults to `true`. Ignored when
	 * the field is told how tall to be ({@link FieldOptions.attrs | attrs}
	 * `"h:20rem"`), as that height wins over the one the text asks for.
	 */
	autoGrow?: boolean;
	/** Fired on every `input` event. */
	input?: (event: Event) => void;
	/** Fired on `change` (commit). */
	change?: (event: Event) => void;
}

A.insertGlobalCss({
	// Start from the height the textarea asks for (its rows, or its text when
	// growing), then grow or shrink to whatever room the field has left: a field
	// told how tall to be (`attrs: "h:8rem"`) hands its height to the textarea,
	// while a field left to size itself has no room to share out, so the textarea
	// keeps its own height. The same rule rides the inset box below, which stands
	// in for the control once a prefix/suffix gives it one.
	"textarea.s-input, .s-inset.s-inset-bottom": "flex: 1 1 auto; min-height:0",
	"textarea.s-input": "resize:vertical min-height:3em line-height:1.45",
	// Sized to its text there is nothing to scroll; `fitToContent` turns scrolling
	// on once a caller caps the height (`inputAttrs: "max-height:12em"`).
	"textarea.s-input.s-autoGrow": "resize:none min-height:2.5em overflow-y:hidden",
});

/**
 * A multi-line text input. Shares the field chrome and styling of
 * {@link textline}.
 *
 * It sizes itself to its text by default. Give the *field* a height instead
 * ({@link FieldOptions.attrs | attrs} `"h:20rem"`, or `"h:100%"` inside a column
 * that has one) and the textarea fills it, whatever else the field holds — a
 * label, help text, a `prefix`/`suffix` inset.
 *
 * @example
 * ```ts
 * const $user = A.proxy({bio: ""});
 * S.textarea({ label: "Bio", bind: A.ref($user, "bio") });
 *
 * // A chat box: the send button sits in the bottom-right corner, inside the field.
 * const $chat = A.proxy({text: ""});
 * S.textarea({
 *   placeholder: "Message…",
 *   bind: A.ref($chat, "text"),
 *   suffix: () => S.iconButton({ icon: send, tooltip: "Send", click: () => post($chat.text) }),
 * });
 *
 * // Told how tall to be, the textarea fills the field instead of growing with
 * // its text — `h:100%` in a column that has a height makes a composer that
 * // fills whatever room it is given.
 * S.textarea({ label: "Notes", attrs: "h:20rem", bind: A.ref($chat, "text") });
 * ```
 */
export function textarea(opts: TextareaOptions = {}): void {
	const grow = opts.autoGrow !== false;

	drawField(opts, (id, isInvalid) => {
		// Insets ride the bottom edge here: on a growing box that keeps a send
		// button beside the caret rather than floating it mid-paragraph.
		drawInsets(opts, true, () => {
			const el = A("textarea.s-input", opts.inputAttrs, () => {
				if (grow) {
					A(".s-autoGrow");
					A("input=", (e: Event) => {
						fitToContent(e.currentTarget as HTMLTextAreaElement);
						if (opts.input) opts.input(e);
					});
				} else {
					A("rows=", opts.rows ?? 4);
					A("resize:", opts.resize ?? (opts.suffix ? "none" : "vertical"));
					if (opts.input) A("input=", opts.input);
				}
				if (opts.placeholder != null) A("placeholder=", opts.placeholder);
				if (opts.value != null && !opts.bind) A("value=", opts.value);
				if (opts.change) A("change=", opts.change);
				applyControlAttrs(opts, id, isInvalid, opts.bind);
			}) as HTMLTextAreaElement;

			if (grow) requestAnimationFrame(() => fitToContent(el));
		});
	});
}

function fitToContent(el: HTMLTextAreaElement): void {
	// Measure a copy taken out of the flow: collapsing the textarea itself would
	// scroll its caret into view of the collapsed box and shrink the page under
	// it, so a capped textarea, or the page, would jump on every keystroke.
	const probe = el.cloneNode() as HTMLTextAreaElement;
	probe.value = el.value;
	Object.assign(probe.style, {
		position: "absolute",
		visibility: "hidden",
		width: `${el.offsetWidth}px`,
		height: "auto",
		// Measure without a scrollbar: one would narrow the text and wrap it early.
		overflowY: "",
	});
	el.after(probe);
	// `scrollHeight` measures the padding box, while the height we set sizes the
	// border box: add the borders back, or the text ends up two pixels too tall
	// for its box and the textarea scrolls by that much.
	const height = probe.scrollHeight + probe.offsetHeight - probe.clientHeight;
	probe.remove();
	el.style.height = `${height}px`;
	// Scroll only once a `max-height` caps the box: `scrollHeight` is rounded, so
	// an uncapped box can fall a fraction of a pixel short and show a bar.
	el.style.overflowY = el.offsetHeight < height ? "auto" : "";
}

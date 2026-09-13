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
	// `flex-basis:100%` with nothing to stop it shrinking means "take the field's
	// height, then give back whatever the label and help need" — so a field told
	// how tall to be (`attrs: "h:8rem"`) hands that height to the textarea, while a
	// field left to size itself (every ordinary one) has no definite height for the
	// basis to resolve against and the textarea is content-sized exactly as before.
	// The same rule rides the inset box below, which stands in for the control once
	// a prefix/suffix gives it one.
	"textarea.s-input, .s-inset.s-inset-bottom": "flex: 0 1 100%; min-height:0",
	"textarea.s-input": "resize:vertical min-height:3em line-height:1.45",
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
	el.style.height = "auto";
	el.style.height = `${el.scrollHeight}px`;
}

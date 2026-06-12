import A from "aberdeen";
import type { Bindable } from "../core.js";
import { type FieldOptions, applyControlAttrs, drawField } from "./field.js";

/** Options for {@link textarea}. */
export interface TextareaOptions extends FieldOptions {
	/** Placeholder text. */
	placeholder?: string;
	/** Two-way binding target. */
	bind?: Bindable<string>;
	/** Static initial value. */
	value?: string;
	/** Visible number of text rows. Defaults to `4`. Ignored when `autoGrow` is enabled. */
	rows?: number;
	/** Whether the textarea may be resized by the user. Defaults to `"vertical"`. Ignored when `autoGrow` is enabled. */
	resize?: "none" | "vertical" | "horizontal" | "both";
	/** Auto-grow the textarea to fit its content. Defaults to `true`. */
	autoGrow?: boolean;
	/** Fired on every `input` event. */
	input?: (event: Event) => void;
	/** Fired on `change` (commit). */
	change?: (event: Event) => void;
}

A.insertGlobalCss({
	"textarea.s-input": "resize:vertical min-height:3em line-height:1.45",
	"textarea.s-input.s-autoGrow": "resize:none min-height:2.5em overflow-y:hidden",
});

/**
 * A multi-line text input. Shares the field chrome and styling of
 * {@link textline}.
 *
 * @example
 * ```ts
 * const $user = A.proxy({bio: ""});
 * S.textarea({ label: "Bio", bind: A.ref($user, "bio") });
 * ```
 */
export function textarea(opts: TextareaOptions = {}): void {
	const grow = opts.autoGrow !== false;

	drawField(opts, (id, isInvalid) => {
		const el = A("textarea.s-input", opts.inputAttrs, () => {
			if (grow) {
				A(".s-autoGrow");
				A("input=", (e: Event) => {
					fitToContent(e.currentTarget as HTMLTextAreaElement);
					if (opts.input) opts.input(e);
				});
			} else {
				A("rows=", opts.rows ?? 4);
				A("resize:", opts.resize ?? "vertical");
				if (opts.input) A("input=", opts.input);
			}
			if (opts.placeholder != null) A("placeholder=", opts.placeholder);
			if (opts.value != null && !opts.bind) A("value=", opts.value);
			if (opts.change) A("change=", opts.change);
			applyControlAttrs(opts, id, isInvalid, opts.bind);
		}) as HTMLTextAreaElement;

		if (grow) requestAnimationFrame(() => fitToContent(el));
	});
}

function fitToContent(el: HTMLTextAreaElement): void {
	el.style.height = "auto";
	el.style.height = `${el.scrollHeight}px`;
}

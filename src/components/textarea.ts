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
	/** Visible number of text rows. Defaults to `4`. */
	rows?: number;
	/** Whether the textarea may be resized by the user. Defaults to `"vertical"`. */
	resize?: "none" | "vertical" | "horizontal" | "both";
	/** Fired on every `input` event. */
	input?: (event: Event) => void;
	/** Fired on `change` (commit). */
	change?: (event: Event) => void;
}

A.insertGlobalCss({
	"textarea.S_input": "resize:vertical min-height:3em line-height:1.45",
});

/**
 * A multi-line text input. Shares the field chrome and styling of
 * {@link textline}, adding `rows` and `resize` controls.
 *
 * @example
 * ```ts
 * S.textarea({ label: "Bio", rows: 6, bind: A.ref($user, "bio") });
 * ```
 */
export function textarea(opts: TextareaOptions = {}): void {
	drawField(opts, (id, isInvalid) => {
		A("textarea.S_input", opts.control, () => {
			A("rows=", opts.rows ?? 4);
			A("resize:", opts.resize ?? "vertical");
			if (opts.placeholder != null) A("placeholder=", opts.placeholder);
			if (opts.value != null && !opts.bind) A("value=", opts.value);
			if (opts.input) A("input=", opts.input);
			if (opts.change) A("change=", opts.change);
			applyControlAttrs(opts, id, isInvalid, opts.bind);
		});
	});
}

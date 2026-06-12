import A from "aberdeen";
import type { Bindable } from "../core.js";
import { type FieldOptions, applyControlAttrs, drawField } from "./field.js";

/**
 * The `<input>` types {@link textline} supports. Deliberately excludes types
 * that need their own widget (`checkbox`, `radio`, `color`, `range`, `file`,
 * `button`, ...) — use the dedicated components for those.
 */
export type TextlineType =
	| "text"
	| "password"
	| "email"
	| "number"
	| "tel"
	| "url"
	| "search"
	| "date"
	| "time"
	| "datetime-local"
	| "month"
	| "week";

/** Options for {@link textline}. */
export interface TextlineOptions extends FieldOptions {
	/** Input type. Defaults to `"text"`. */
	type?: TextlineType;
	/** Placeholder text. */
	placeholder?: string;
	/** Two-way binding target (e.g. `A.ref($user, "name")`). */
	bind?: Bindable<string | number>;
	/** Static initial value (use {@link TextlineOptions.bind | bind} for reactivity). */
	value?: string | number;
	/** Autocomplete hint passed to the native `autocomplete` attribute. */
	autocomplete?: string;
	/** Fired on every `input` event with the native event. */
	input?: (event: Event) => void;
	/** Fired on `change` (commit) with the native event. */
	change?: (event: Event) => void;
}

/**
 * A single-line text input — covering text, passwords, numbers, email, dates and
 * the other line-oriented `<input>` types.
 *
 * Renders inside the standard {@link drawField} chrome (label, control,
 * help/error), so it aligns cleanly inside a {@link form}.
 *
 * @example
 * ```ts
 * const $user = A.proxy({email: "test@example.com"});
 * S.textline({ label: "Email", type: "email", required: true, bind: A.ref($user, "email") });
 * ```
 */
export function textline(opts: TextlineOptions = {}): void {
	drawField(opts, (id, isInvalid) => {
		A("input.s-input", opts.inputAttrs, () => {
			A("type=", opts.type ?? "text");
			if (opts.placeholder != null) A("placeholder=", opts.placeholder);
			if (opts.autocomplete != null) A("autocomplete=", opts.autocomplete);
			if (opts.value != null && !opts.bind) A("value=", opts.value);
			if (opts.input) A("input=", opts.input);
			if (opts.change) A("change=", opts.change);
			applyControlAttrs(opts, id, isInvalid, opts.bind);
		});
	});
}

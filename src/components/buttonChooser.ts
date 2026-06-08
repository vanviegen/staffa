import A from "aberdeen";
import { type Bindable, type Attributes } from "../core.js";
import { buttonGroup } from "./buttonGroup.js";

/** Options for {@link buttonChooser}. */
export interface ButtonChooserOptions {
	/** Aberdeen attr/style string applied to the button group. */
	attrs?: Attributes;
	/**
	 * The options to display, as a plain object mapping id → display label.
	 * Buttons appear in insertion order.
	 */
	options: Record<string, string>;
	/**
	 * Two-way binding for the selected id, or `null` when nothing is selected.
	 * Use an `A.proxy` or `A.ref`.
	 */
	bind: Bindable<string | null>;
	/**
	 * When `true`, clicking the already-selected button deselects it, setting
	 * `bind.value` to `null`. Useful for "none / auto" states.
	 */
	allowDeselect?: boolean;
	/** Name attribute for the hidden `<input>`, enabling form submission. */
	name?: string;
}

/**
 * A single-selection segmented control: an attached button group where exactly
 * one button is active at a time. Optionally allows deselecting back to `null`.
 *
 * Renders a hidden `<input>` alongside (when `name` is set) so the selected
 * value is included in native form submission.
 *
 * @example
 * ```ts
 * const $view = A.proxy({ value: "day" as string | null });
 * S.buttonChooser({
 *   options: { day: "Day", week: "Week", month: "Month" },
 *   bind: $view,
 * });
 * ```
 */
export function buttonChooser(opts: ButtonChooserOptions): void {
	A(() => {
		const selected = opts.bind.value;
		buttonGroup({
			attrs: opts.attrs,
			buttons: Object.entries(opts.options).map(([id, label]) => ({
				text: label,
				attrs: selected === id ? ".primary" : ".neutral .outlined",
				click: () => {
					opts.bind.value = (opts.allowDeselect && selected === id) ? null : id;
				},
			})),
		});
	});

	if (opts.name) {
		// Hidden input carries the value into native form submission.
		A(() => A(`input type=hidden name=${opts.name} value=`, opts.bind.value ?? ""));
	}
}

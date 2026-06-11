import A from "aberdeen";
import { type Bindable, type Attributes, type Slot } from "../core.js";
import { buttonGroup } from "./buttonGroup.js";

/** Options for {@link buttonChooser}. */
export interface ButtonChooserOptions {
	/** Aberdeen attr/style string applied to the button group. */
	attrs?: Attributes;
	/**
	 * The options to display, as a plain object mapping id → display label.
	 * Buttons appear in insertion order. A label may be a plain (rich-text)
	 * string, or a draw-function for custom content such as an icon.
	 */
	options: Record<string, Slot>;
	/**
	 * Two-way binding for the selected id, or `undefined` when nothing is selected.
	 * Use an `A.proxy` or `A.ref`.
	 */
	bind: Bindable<string | undefined>;
	/**
	 * When `true`, clicking the already-selected button deselects it, setting
	 * `bind.value` to `undefined`. Useful for "none / auto" states.
	 */
	allowDeselect?: boolean;
	/** Name attribute for the hidden `<input>`, enabling form submission. */
	name?: string;
}

/**
 * A single-selection segmented control: an attached button group where exactly
 * one button is active at a time. Optionally allows deselecting back to `undefined`.
 *
 * Renders a hidden `<input>` alongside (when `name` is set) so the selected
 * value is included in native form submission.
 *
 * @example
 * ```ts
 * const $view = A.proxy({ value: "day" as string | undefined });
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
				content: label,
				// Icon-only options (draw-function labels) get the id as their
				// accessible name; plain-text labels speak for themselves.
				ariaLabel: typeof label === "function" ? id : undefined,
				attrs: selected === id ? ".primary" : ".neutral .outlined",
				click: () => {
					opts.bind.value = (opts.allowDeselect && selected === id) ? undefined : id;
				},
			})),
		});
	});

	if (opts.name) {
		// Hidden input carries the value into native form submission.
		A(() => A(`input type=hidden name=${opts.name} value=`, opts.bind.value ?? ""));
	}
}

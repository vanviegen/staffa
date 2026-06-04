import A from "aberdeen";
import { type Bindable, type Slot, drawSlot, uniqueId } from "../core.js";
import type { FieldOptions } from "./field.js";

/** Options for {@link checkbox}. */
export interface CheckboxOptions extends Omit<FieldOptions, "label"> {
	/** The label shown next to the box. Required for a meaningful checkbox. */
	label?: Slot;
	/** Two-way binding target holding a boolean. */
	bind?: Bindable<boolean>;
	/** Static initial checked state. */
	checked?: boolean;
	/** Fired on `change` with the native event. */
	change?: (event: Event) => void;
}

A.insertGlobalCss({
	".S_check": {
		"&": "display:flex flex-direction:column gap:$1",
		"> label": "display:flex align-items:center gap:$2 cursor:pointer",
		"> label:has(input:disabled)": "cursor:not-allowed opacity:0.6",
		// Native control styled with accent-color: accessible and zero-fuss.
		"input": "width:1.15em height:1.15em accent-color:$sPrimary cursor:inherit m:0",
	},
});

/**
 * A checkbox with an associated, clickable label. Uses the native `<input
 * type=checkbox>` (styled with `accent-color`) for full keyboard and screen
 * reader support.
 *
 * @example
 * ```ts
 * S.checkbox({ label: "Subscribe to newsletter", bind: A.ref($prefs, "newsletter") });
 * ```
 */
export function checkbox(opts: CheckboxOptions = {}): void {
	const id = opts.id ?? uniqueId("check");

	A("div.S_check", opts.root, () => {
		A(`label for=${id}`, () => {
			A("input type=checkbox", opts.control, () => {
				A(`id=${id}`);
				if (opts.name) A(`name=${opts.name}`);
				// `checked` is a boolean attribute: only set it when actually true.
				if (opts.checked && !opts.bind) A("checked=true");
				if (opts.change) A("change=", opts.change);
				A(() => {
					if (opts.disabled) A("disabled=true");
				});
				A(() => {
					if (opts.required) A("aria-required=true");
				});
				if (opts.bind) A("bind=", opts.bind);
			});
			// Own scope so the label text/required marker don't recreate the input.
			A(() => {
				if (opts.label != null) drawSlot(opts.label);
				if (opts.required) A("span.S_req aria-hidden=true #*");
			});
		});

		A(() => {
			if (opts.help != null && !opts.error) A("div.S_help", () => drawSlot(opts.help));
		});
		A(() => {
			if (opts.error) A("div.S_error role=alert #", opts.error);
		});
	});
}

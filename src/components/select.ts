import A from "aberdeen";
import { type Bindable } from "../core.js";
import { type FieldOptions, applyControlAttrs, drawField } from "./field.js";

/** A selectable option: a bare string, or a `{ value, label }` pair. */
export type SelectOptionInput = string | { value: string; label?: string };

/** Options for {@link select}. */
export interface SelectOptions extends FieldOptions {
	/** The list of selectable options. */
	options: SelectOptionInput[] | (() => SelectOptionInput[]);
	/** Two-way binding for the selected value string (`""` when nothing is selected). */
	bind?: Bindable<string>;
	/** Placeholder option shown when nothing is selected yet. */
	placeholder?: string;
}

// Wrapper provides the chevron via ::after (pseudo-elements on <select> are unreliable).
A.insertGlobalCss({
	".s-select_wrap": {
		"&": "position:relative display:block",
		"select": "w:100% cursor:pointer padding-right:2.2em; appearance:none",
		"&::after": "content: '▾'; position:absolute right:0.7em top:50%; transform: translateY(-50%); pointer-events:none fg:$s-fg-muted font-size:0.85em",
	},
});

/**
 * A single-select dropdown backed by a native `<select>` element. Looks like the
 * other Staffa inputs but delegates all focus management, keyboard navigation, and
 * mobile-native picker behaviour to the browser.
 *
 * @example
 * ```ts
 * S.select({ label: "Country", options: ["Belgium", "Netherlands"], bind: $sel });
 * ```
 */
export function select(opts: SelectOptions): void {
	drawField(opts, (id, isInvalid) => {
		A("div.s-select_wrap", opts.inputAttrs, () => {
			A("select.s-input", () => {
				applyControlAttrs(opts, id, isInvalid);

				A("change=", (e: Event) => {
					if (opts.bind) opts.bind.value = (e.target as HTMLSelectElement).value;
				});

				// Render options reactively; re-runs when options list or selected value changes.
				A(() => {
					const raw = typeof opts.options === "function" ? opts.options() : opts.options;
					const current = (opts.bind?.value ?? "") as string;

					if (opts.placeholder != null) {
						A("option", () => {
							A("value= disabled=true hidden=true");
							if (!current) A("selected=true");
							A("#", opts.placeholder!);
						});
					}

					for (const o of raw) {
						const opt =
							typeof o === "string"
								? { value: o, label: o }
								: { value: o.value, label: o.label ?? o.value };
						A("option", () => {
							A("value=", opt.value);
							if (opt.value === current) A("selected=true");
							A("#", opt.label);
						});
					}
				});
			});
		});
	});
}

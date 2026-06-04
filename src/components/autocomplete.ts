import A from "aberdeen";
import { type Bindable, uniqueId } from "../core.js";
import { type FieldOptions, drawField } from "./field.js";

/** A selectable option: a bare string, or a `{ value, label }` pair. */
export type AutocompleteOptionInput = string | { value: string; label?: string };

interface AcOption {
	value: string;
	label: string;
}

/** Options for {@link autocomplete}. */
export interface AutocompleteOptions extends FieldOptions {
	/**
	 * The candidate options. May be a static array or a function returning one —
	 * the function is called inside a reactive scope, so it can read proxied state
	 * to provide dynamic/async suggestions.
	 */
	options: AutocompleteOptionInput[] | (() => AutocompleteOptionInput[]);
	/**
	 * Two-way binding for the selection. In single mode this is the selected
	 * `value` string (`""` when empty). In {@link AutocompleteOptions.multi} mode
	 * it is an array of value strings.
	 */
	bind?: Bindable<string | string[]>;
	/** Allow selecting several values, shown as removable chips. */
	multi?: boolean;
	/** Allow committing free text that isn't in the options list. Defaults to `true`. */
	allowCustom?: boolean;
	/** Placeholder for the text input. */
	placeholder?: string;
}

A.insertGlobalCss({
	".S_ac": {
		"&": "position:relative",
		"> .S_control": "display:flex flex-wrap:wrap align-items:center gap:$1 bg:$sSurface fg:$sFg border: 1px solid $sBorder; r:$sRadius padding: 0.3em 0.4em; cursor:text; transition: border-color 0.15s, box-shadow 0.15s;",
		"> .S_control:hover": "border-color:$sBorderStrong",
		"> .S_control:focus-within": "border-color:$sPrimary box-shadow: 0 0 0 3px $sFocus;",
		"&[aria-invalid=true] > .S_control": "border-color:$sDanger",
		".S_chip": "display:inline-flex align-items:center gap:$1 font-size:0.85em bg:$sSurfaceHi border: 1px solid $sBorder; r:$sRadius padding: 0.1em 0.2em 0.1em 0.5em;",
		".S_chip > button": "cursor:pointer border:0 background:transparent fg:$sFgMuted font-size:1.1em line-height:1 padding: 0 0.2em; r:4px",
		".S_chip > button:hover": "fg:$sFg background:$sBorder",
		"input": "flex:1 min-width:6ch border:0 background:transparent color:inherit outline:none padding:0.25em",
		"> .S_menu": "position:absolute top:100% left:0 right:0 z-index:20 margin-top:4px max-height:15rem overflow-y:auto list-style:none p:$1 margin-bottom:0 bg:$sSurface border: 1px solid $sBorder; r:$sRadius box-shadow:$sShadow",
		".S_option": "padding: 0.45em 0.6em; r:6px cursor:pointer",
		".S_option[aria-selected=true]": "background:$sSurfaceHi",
		".S_add": "fg:$sPrimary font-style:italic",
		".S_empty": "padding: 0.45em 0.6em; fg:$sFgMuted",
	},
});

function normOption(o: AutocompleteOptionInput): AcOption {
	return typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value };
}

/**
 * A combobox with type-ahead filtering. Supports single or multi-select (chips),
 * optional free-text entry, and full keyboard control (arrows, enter, escape,
 * backspace-to-remove). Implements the ARIA combobox/listbox pattern.
 *
 * @example
 * ```ts
 * // Single select from a fixed list
 * S.autocomplete({ label: "Country", options: ["Belgium", "Netherlands"], bind: $sel });
 *
 * // Multi-select, disallowing custom items
 * S.autocomplete({ label: "Tags", multi: true, allowCustom: false,
 *   options: knownTags, bind: A.ref($post, "tags") });
 * ```
 */
export function autocomplete(opts: AutocompleteOptions): void {
	const menuId = uniqueId("ac-menu");
	const $st = A.proxy({ query: "", open: false, active: 0 });

	const getOptions = (): AcOption[] => {
		const raw = typeof opts.options === "function" ? opts.options() : opts.options;
		return raw.map(normOption);
	};
	const selectedValues = (): string[] => {
		const v = opts.bind?.value;
		if (v == null || v === "") return [];
		return Array.isArray(v) ? v : [v];
	};
	const labelFor = (value: string): string => getOptions().find((o) => o.value === value)?.label ?? value;

	// Seed the input with the current single-selection's label.
	if (!opts.multi) {
		const v = opts.bind ? A.peek(opts.bind, 'value') : undefined;
		if (typeof v === "string" && v) $st.query = A.peek(() => labelFor(v));
	}

	const filtered = (): AcOption[] => {
		const sel = new Set(selectedValues());
		let list = getOptions();
		if (opts.multi) list = list.filter((o) => !sel.has(o.value));
		const q = $st.query.trim().toLowerCase();
		if (q) list = list.filter((o) => o.label.toLowerCase().includes(q));
		return list;
	};

	const commit = (value: string, inputEl?: HTMLInputElement) => {
		if (opts.multi) {
			const arr = Array.isArray(opts.bind?.value) ? [...(opts.bind.value as string[])] : [];
			if (!arr.includes(value)) arr.push(value);
			if (opts.bind) opts.bind.value = arr;
			$st.query = "";
		} else {
			if (opts.bind) opts.bind.value = value;
			$st.query = labelFor(value);
			$st.open = false;
		}
		$st.active = 0;
		// Keep focus on the input so the user can Tab to the next field.
		inputEl?.focus();
	};

	const remove = (value: string) => {
		if (!opts.bind) return;
		const arr = (opts.bind.value as string[]) ?? [];
		opts.bind.value = arr.filter((v) => v !== value);
	};

	drawField(opts, (id, isInvalid) => {
		A("div.S_ac", opts.control, () => {
			A(() => A("aria-invalid=", isInvalid() ? "true" : "false"));

			let inputEl: HTMLInputElement | undefined;

			A("div.S_control", () => {
				A("click=", () => inputEl?.focus());

				// Chips for multi-select.
				A(() => {
					if (!opts.multi) return;
					for (const value of selectedValues()) {
						A("span.S_chip", () => {
							A("span #", A.peek(() => labelFor(value)));
							A("button type=button aria-label=", `Remove ${value}`, () => {
								A("#×");
								A("click=", (e: Event) => {
									e.stopPropagation();
									remove(value);
									inputEl?.focus();
								});
							});
						});
					}
				});

				inputEl = A("input type=text role=combobox autocomplete=off", () => {
					A(`id=${id} aria-controls=${menuId} aria-autocomplete=list`);
					if (opts.placeholder != null) A("placeholder=", opts.placeholder);
					if (opts.disabled) A("disabled=true");
					if (opts.required) A("aria-required=true");
					A("bind=", A.ref($st, "query"));
					A(() => A("aria-expanded=", $st.open ? "true" : "false"));
					A(() => {
						const list = filtered();
						const act = list[$st.active];
						A("aria-activedescendant=", $st.open && act ? `${menuId}-opt-${$st.active}` : "");
					});
					A("input=", () => {
						$st.open = true;
						$st.active = 0;
					});
					A("focus=", () => {
						$st.open = true;
					});
					A("blur=", () => {
						// Delay so option mousedown/click can run first.
						setTimeout(() => onBlur(), 150);
					});
					A("keydown=", (e: KeyboardEvent) => onKey(e, inputEl));
				}) as HTMLInputElement;
			});

			// The suggestions popup.
			A(() => {
				if (!$st.open) return;
				const list = filtered();
				const q = $st.query.trim();
				const showAdd = opts.allowCustom !== false && q !== "" && !list.some((o) => o.label.toLowerCase() === q.toLowerCase());

				A("ul.S_menu role=listbox", `id=${menuId}`, () => {
					list.forEach((option, i) => {
						A("li.S_option role=option", `id=${menuId}-opt-${i}`, () => {
							A(() => A("aria-selected=", $st.active === i ? "true" : "false"));
							A("#", option.label);
							A("mousedown=", (e: Event) => e.preventDefault());
							A("click=", () => commit(option.value, inputEl));
							A("mousemove=", () => {
								$st.active = i;
							});
						});
					});
					if (showAdd) {
						A("li.S_option.S_add role=option", () => {
							A("#", `Add "${q}"`);
							A("mousedown=", (e: Event) => e.preventDefault());
							A("click=", () => commit(q, inputEl));
						});
					}
					if (list.length === 0 && !showAdd) {
						A("li.S_empty #No matches");
					}
				});
			});

			// Hidden inputs so the selection participates in native FormData.
			A(() => {
				if (!opts.name) return;
				if (opts.multi) {
					for (const val of selectedValues()) {
						A("input type=hidden", () => {
							A("name=", opts.name!);
							A("value=", val);
						});
					}
				} else {
					A("input type=hidden", () => {
						A("name=", opts.name!);
						A("value=", selectedValues()[0] ?? "");
					});
				}
			});
		});
	});

	function onKey(e: KeyboardEvent, inputEl?: HTMLInputElement) {
		const list = filtered();
		const max = list.length - 1;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			$st.open = true;
			$st.active = Math.min(max, $st.active + 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			$st.active = Math.max(0, $st.active - 1);
		} else if (e.key === "Enter") {
			// Always prevent default to avoid accidental form submission.
			e.preventDefault();
			const chosen = list[$st.active];
			if (chosen) {
				commit(chosen.value, inputEl);
			} else if (opts.allowCustom !== false && $st.query.trim()) {
				commit($st.query.trim(), inputEl);
			} else if ($st.open) {
				$st.open = false;
			}
		} else if (e.key === "Escape") {
			$st.open = false;
			if (!opts.multi) $st.query = labelFor(selectedValues()[0] ?? "");
		} else if (e.key === "Backspace" && opts.multi && $st.query === "") {
			const sel = selectedValues();
			if (sel.length) remove(sel[sel.length - 1]!);
		}
	}

	function onBlur() {
		$st.open = false;
		if (opts.multi) {
			$st.query = "";
		} else if (opts.allowCustom !== false && $st.query.trim()) {
			commit($st.query.trim());
		} else {
			// Revert to the committed selection's label.
			$st.query = labelFor(selectedValues()[0] ?? "");
		}
	}
}

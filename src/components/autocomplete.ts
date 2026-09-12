import A from "aberdeen";
import { type Bindable, followAnchor, mountPortal, uniqueId } from "../core.js";
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
	/**
	 * Allow committing free text that isn't in the options list. Defaults to
	 * `true`, and includes no text at all: emptying a single-select field clears
	 * its selection (`required` is what makes that an error). With
	 * `allowCustom: false` only the options can be committed, so anything else
	 * springs back to the current selection when the field loses focus.
	 */
	allowCustom?: boolean;
	/**
	 * The type-ahead test, run for each option against what has been typed.
	 * Defaults to {@link matchWords}. Pass your own to filter differently — say
	 * `(label, q) => label.toLowerCase().includes(q.toLowerCase())` for plain
	 * substring matching, or something that also looks at an option's other
	 * fields. Matching never reorders: options are shown as given.
	 */
	match?: (label: string, query: string) => boolean;
	/** Placeholder for the text input. */
	placeholder?: string;
}

A.insertGlobalCss({
	".s-ac": {
		// Same light inset field as `.s-input` (see field.ts), derived from the surface.
		"> .s-control": "display:flex flex-wrap:wrap align-items:center gap:$1 background: color-mix(in oklab, $s-bg, $s-text 4%); color:$s-text border: 1px solid $s-faint; r:$s-radius padding: 0.3em 0.4em; cursor:text; transition: border-color 0.15s, box-shadow 0.15s;",
		"> .s-control:hover": "border-color: color-mix(in oklab, $s-text, $s-bg 55%);",
		"> .s-control:focus-within": "border-color:$s-accent box-shadow: 0 0 0 3px $s-focus;",
		"&[aria-invalid=true] > .s-control": "border-color:$s-danger",
		".s-chip": "display:inline-flex align-items:center gap:$1 font-size:0.85em background: color-mix(in oklab, $s-bg, $s-text 10%); border: 1px solid $s-faint; r:$s-radius padding: 0.1em 0.2em 0.1em 0.5em;",
		".s-chip > button": "cursor:pointer border:0 background:transparent fg:$s-muted font-size:1.1em line-height:1 padding: 0 0.2em; r:4px",
		".s-chip > button:hover": "fg:$s-text background:$s-faint",
		"input": "flex:1 min-width:6ch border:0 background:transparent color:inherit outline:none padding:0.25em",
	},
	// Background, border, radius and elevation come from the `.s-s.neutral.shadow`
	// surface it carries; `place()` below sizes and positions it. Both of its
	// classes are named here: standing in `<body>` rather than inside the field,
	// it would otherwise lose to theme.ts's flow margins on `ul` and `li`.
	".s-ac-menu.s-s": {
		"&": "position:fixed max-height:15rem overflow-y:auto list-style:none p:$1 margin:0",
		li: "margin:0",
		".s-option": "padding: 0.45em 0.6em; r:6px cursor:pointer transition: background 0.1s;",
		".s-option[aria-selected=true]": "background: color-mix(in srgb, $s-text 10%, transparent);",
		".s-add": "fg:$s-accent font-style:italic",
		".s-empty": "padding: 0.45em 0.6em; fg:$s-muted",
	},
});

/** The list one {@link autocomplete} currently has up. */
interface AcPopup {
	/** The `<ul>`'s id, which the field points `aria-controls` at — and its identity here. */
	id: string;
	/** The field's control box: the list matches its width and hangs off it. */
	anchor: HTMLElement;
	/** Over the dialog the field stands in, or under the dialog layer altogether. */
	zIndex: number;
	/** Draws the `<li>`s, reading the field's own state from its closure. */
	draw: () => void;
}

// Only one list is up at a time — it belongs to whichever field has focus — so
// one portal at the end of <body> serves them all. Drawn inside the field, the
// list would be clipped by a dialog or a scrolling column, and would stretch
// that scroller's bar to reach it.
const $popup = A.proxy<{ cur: AcPopup | null }>({ cur: null });

/** Hang the list under the field — or over it, when that's where the room is. */
function place(el: HTMLElement, r: DOMRect): void {
	const gap = 4, edge = 8;
	// Measured at the stylesheet's own cap, so the flip is decided on the height
	// the list wants, not on whatever the last placement clamped it to.
	el.style.maxHeight = "";
	const want = el.offsetHeight;
	const below = window.innerHeight - r.bottom - gap - edge;
	const above = r.top - gap - edge;
	const up = want > below && above > below;
	el.style.left = `${r.left}px`;
	el.style.width = `${r.width}px`;
	el.style.maxHeight = `${Math.min(want, Math.max(up ? above : below, 60))}px`;
	el.style.top = up ? "auto" : `${r.bottom + gap}px`;
	el.style.bottom = up ? `${window.innerHeight - r.top + gap}px` : "auto";
}

mountPortal(() => {
	const p = $popup.cur;
	if (!p) return;
	let sizeChanged: (() => void) | undefined;

	const el = A("ul.s-ac-menu.s-s.neutral.shadow role=listbox", `id=${p.id} z-index:${p.zIndex}`, () => {
		// A press in the list must not blur the field: the click that follows is
		// what commits, and dragging the scrollbar has to keep it open too.
		A("mousedown=", (e: Event) => e.preventDefault());
		p.draw();
		// Re-run as you type, with the rows; the list's height changes with them.
		sizeChanged?.();
	}) as HTMLElement;

	sizeChanged = followAnchor(p.anchor, (r) => place(el, r));
});

/**
 * Where each word of a label begins: runs of letters or digits, split again at
 * camelCase humps — "TypeScript" starts a word at `T` and at `S`.
 */
function wordStarts(label: string): number[] {
	const starts: number[] = [];
	for (const m of label.matchAll(/\p{N}+|\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+/gu)) starts.push(m.index);
	return starts;
}

/**
 * The default type-ahead test: every whitespace-separated term of the query has
 * to match the label from a word start on, and no two terms may claim the same
 * word. Order doesn't matter, so "se pal" finds "Palette search" just as
 * "pal se" does — but "ette" finds nothing, as you type the beginnings of
 * words. A term may run past its word's end ("typescript" finds "TypeScript",
 * "c++" finds "C++"), so typing a label out in full always finds it.
 *
 * Pass it to {@link AutocompleteOptions.match} to compose with it.
 */
export function matchWords(label: string, query: string): boolean {
	// Longest term first: it is the most constrained, so the greedy claim below
	// doesn't let a short term take the word a long one needed.
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
	if (!terms.length) return true;
	const starts = wordStarts(label);
	const used: boolean[] = [];
	return terms.every((t) => {
		const i = starts.findIndex((s, i) => !used[i] && label.slice(s, s + t.length).toLowerCase() === t);
		if (i < 0) return false;
		used[i] = true;
		return true;
	});
}

function normOption(o: AutocompleteOptionInput): AcOption {
	return typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value };
}

/**
 * A combobox with type-ahead filtering. Supports single or multi-select (chips),
 * optional free-text entry, and full keyboard control (arrows, enter, escape,
 * backspace-to-remove). Implements the ARIA combobox/listbox pattern.
 *
 * What you type is matched against the start of the label's words, a term at a
 * time and in any order — "pal se" finds "Palette search" — see
 * {@link matchWords}, or {@link AutocompleteOptions.match} to filter your own way.
 *
 * The suggestion list is portalled to `document.body`, so a dialog or a
 * scrolling column can neither clip it nor grow a scrollbar around it. It hangs
 * off whichever side of the field has the room, and follows it as things move.
 *
 * @example
 * ```ts
 * // Single select from a fixed list
 * const $sel = A.proxy("Netherlands");
 * S.autocomplete({ label: "Country", options: ["Belgium", "Netherlands"], bind: $sel });
 *
 * // Multi-select, disallowing custom items
 * const $tags = A.proxy({value: [] as string[]});
 * S.autocomplete({
 *   label: "Tags",
 *   multi: true,
 *   allowCustom: false,
 *   options: ["Rust", "JS", "C++", "Klingon", "Go"],
 *   bind: A.ref($tags)
 * });
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
	// What committing free text means: the option the text names, or the text itself.
	// Typing a label out in full is picking that option, not inventing a value.
	const valueForText = (text: string): string =>
		text ? getOptions().find((o) => o.label.toLowerCase() === text.toLowerCase())?.value ?? text : "";

	// Seed the input with the current single-selection's label.
	if (!opts.multi) {
		const v = opts.bind ? A.peek(opts.bind, 'value') : undefined;
		if (typeof v === "string" && v) $st.query = A.peek(() => labelFor(v));
	}

	const filtered = (): AcOption[] => {
		const sel = new Set(selectedValues());
		let list = getOptions();
		if (opts.multi) list = list.filter((o) => !sel.has(o.value));
		// Cased as typed: the matcher splits on camelCase humps, and lowercases itself.
		const q = $st.query.trim();
		if (q) list = list.filter((o) => (opts.match ?? matchWords)(o.label, q));
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

	let inputEl: HTMLInputElement | undefined;

	/** The list's rows. Runs in the body portal, on this field's state. */
	const drawList = () => {
		const list = filtered();
		const q = $st.query.trim();
		const showAdd = opts.allowCustom !== false && q !== "" && !list.some((o) => o.label.toLowerCase() === q.toLowerCase());

		list.forEach((option, i) => {
			A("li.s-option role=option", `id=${menuId}-opt-${i}`, () => {
				A(() => A("aria-selected=", $st.active === i ? "true" : "false"));
				A("#", option.label);
				A("click=", () => commit(option.value, inputEl));
				A("mousemove=", () => {
					$st.active = i;
				});
			});
		});
		if (showAdd) {
			A("li.s-option.s-add role=option", () => {
				A("#", `Add "${q}"`);
				A("click=", () => commit(q, inputEl));
			});
		}
		if (list.length === 0 && !showAdd) {
			A("li.s-empty #No matches");
		}
	};

	drawField(opts, (id, isInvalid) => {
		A("div.s-ac", opts.inputAttrs, () => {
			A(() => A("aria-invalid=", isInvalid() ? "true" : "false"));

			const controlEl = A("div.s-control", () => {
				A("click=", () => inputEl?.focus());

				// Chips for multi-select.
				A(() => {
					if (!opts.multi) return;
					for (const value of selectedValues()) {
						A("span.s-chip", () => {
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
					A("id=", id, `aria-controls=${menuId} aria-autocomplete=list`);
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
			}) as HTMLElement;

			// Hand the list to the portal for as long as it is up. Its layer clears
			// the dialog the field sits in, but stays under one that may open over
			// it — a field on the page can't paint across a modal.
			A(() => {
				if (!$st.open) return;
				const zIndex = controlEl.closest(".s-dialog") ? 350 : 150;
				$popup.cur = { id: menuId, anchor: controlEl, zIndex, draw: drawList };
				A.clean(() => { if ($popup.cur?.id === menuId) $popup.cur = null; });
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
			const q = $st.query.trim();
			// Only a row of a list that is up: with it hidden there is no highlight to
			// be seen, so Enter takes what has been typed instead.
			const chosen = $st.open ? list[$st.active] : undefined;
			if (chosen) {
				commit(chosen.value, inputEl);
			} else if (opts.allowCustom !== false && (q || !opts.multi)) {
				// No text is a commit too, in single mode: it clears the selection.
				// (In multi mode there is nothing to clear, and no chip to make.)
				commit(valueForText(q), inputEl);
			} else if ($st.open) {
				// Nothing to commit (the options are all there is, and none match).
				$st.open = false;
			}
		} else if (e.key === "Escape") {
			// Escape hides the list and leaves what was typed standing — it dismisses
			// a layer, it doesn't undo an edit. Only consumed while the list is up, so
			// a surrounding dialog closes on the next press, not this one.
			if ($st.open) {
				e.preventDefault();
				$st.open = false;
			}
		} else if (e.key === "Backspace" && opts.multi && $st.query === "") {
			const sel = selectedValues();
			if (sel.length) remove(sel[sel.length - 1]!);
		}
	}

	function onBlur() {
		$st.open = false;
		if (opts.multi) {
			$st.query = "";
		} else if (opts.allowCustom !== false) {
			// Free text stands as typed — nothing at all included, which is how a
			// single selection is cleared. (`required` is what makes empty an error.)
			commit(valueForText($st.query.trim()));
		} else {
			// Only the options exist, so anything else reverts to the selected one.
			$st.query = labelFor(selectedValues()[0] ?? "");
		}
	}
}

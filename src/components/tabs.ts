import A from "aberdeen";
import { type BaseOptions, type Bindable, type Content, type Slot, type Styling, drawSlot, uniqueId } from "../core.js";

/** A single tab definition. */
export interface Tab {
	/** Stable id used as the selection value. Falls back to the array index. */
	id?: string;
	/** Tab label shown in the tab strip. */
	label: Slot;
	/** Optional leading icon. */
	icon?: Slot;
	/** Content rendered in the panel when this tab is active. */
	content?: Content;
	/** Disables selecting this tab. */
	disabled?: boolean;
}

/** Options for {@link tabs}. */
export interface TabsOptions extends BaseOptions {
	/** The tabs to display. */
	tabs: Tab[];
	/**
	 * Two-way binding for the selected tab's id. When omitted, the component keeps
	 * its own internal selection, starting at the first tab.
	 */
	bind?: Bindable<string>;
	/** Visual style of the tab strip. Defaults to `"underline"`. */
	variant?: "underline" | "pills";
	/** Aberdeen attr/style string applied to the active panel. */
	inner?: Styling;
}

A.insertGlobalCss({
	".S_tabs": {
		"&": "display:flex flex-direction:column gap:$3",
		".S_tablist": "display:flex gap:$1 align-items:stretch",
		".S_tab":
			"display:inline-flex align-items:center gap:$2 cursor:pointer background:transparent " +
			"border:0 fg:$sFgMuted font-weight:600 padding: 0.6em 0.9em; " +
			"transition: color 0.15s, background 0.15s, border-color 0.15s;",
		".S_tab:hover:not(:disabled)": "fg:$sFg",
		".S_tab:disabled": "opacity:0.5 cursor:not-allowed",
		".S_tab:focus-visible": "outline:none box-shadow: 0 0 0 3px $sFocus; r:$sRadius",
		// Underline variant.
		"&.S_underline .S_tablist": "border-bottom: 1px solid $sBorder;",
		"&.S_underline .S_tab": "border-bottom: 2px solid transparent; margin-bottom:-1px",
		"&.S_underline .S_tab[aria-selected=true]": "fg:$sFg border-bottom-color:$sPrimary",
		// Pills variant.
		"&.S_pills .S_tab": "r:$sRadius",
		"&.S_pills .S_tab[aria-selected=true]": "fg:$sPrimaryFg background:$sPrimary",
		// The panel has no enclosing box, so no default padding — its content
		// aligns flush with the tab strip. Callers add padding/flex via `inner`.
		".S_tabpanel": "display:block",
	},
});

/**
 * A tabbed view. Renders an ARIA `tablist` of buttons and a single live panel
 * for the selected tab. Supports keyboard navigation (left/right/home/end).
 *
 * @example
 * ```ts
 * S.tabs({ tabs: [
 *   { label: "Overview", content: () => A("p#...") },
 *   { label: "Settings", content: () => drawSettings() },
 * ]});
 * ```
 */
export function tabs(opts: TabsOptions): void {
	const variant = opts.variant ?? "underline";
	const groupId = uniqueId("tabs");

	// Resolve a tab's selection key (its id, or its index as a string).
	const keyOf = (tab: Tab, index: number) => tab.id ?? String(index);

	// Selection state: caller-provided binding, or internal.
	const $sel: Bindable<string> = opts.bind ?? A.proxy(keyOf(opts.tabs[0] ?? { label: "" }, 0));

	const select = (tab: Tab, index: number) => {
		if (tab.disabled) return;
		$sel.value = keyOf(tab, index);
	};

	A(`div.S_tabs.S_${variant}`, opts.root, () => {
		A("div.S_tablist role=tablist", () => {
			opts.tabs.forEach((tab, index) => {
				const key = keyOf(tab, index);
				A("button.S_tab type=button role=tab", () => {
					A(`id=${groupId}-tab-${key} aria-controls=${groupId}-panel-${key}`);
					A(() => {
						const selected = $sel.value === key;
						A("aria-selected=", selected ? "true" : "false");
						A("tabindex=", selected ? "0" : "-1");
					});
					if (tab.disabled) A("disabled=true");
					A("click=", () => select(tab, index));
					A("keydown=", (e: KeyboardEvent) => onKey(e, opts.tabs, index, select));
					drawSlot(tab.icon);
					drawSlot(tab.label);
				});
			});
		});

		A("div.S_tabpanel role=tabpanel", opts.inner, () => {
			A(() => {
				const selKey = $sel.value;
				const index = opts.tabs.findIndex((t, i) => keyOf(t, i) === selKey);
				const tab = opts.tabs[index] ?? opts.tabs[0];
				if (!tab) return;
				A(`id=${groupId}-panel-${keyOf(tab, index)} aria-labelledby=${groupId}-tab-${keyOf(tab, index)}`);
				tab.content?.();
			});
		});
	});
}

/** Roving-tabindex keyboard handling for the tab strip. */
function onKey(
	e: KeyboardEvent,
	list: Tab[],
	index: number,
	select: (tab: Tab, index: number) => void,
): void {
	let next = index;
	if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % list.length;
	else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + list.length) % list.length;
	else if (e.key === "Home") next = 0;
	else if (e.key === "End") next = list.length - 1;
	else return;
	e.preventDefault();

	// Skip disabled tabs in the chosen direction.
	const dir = next >= index ? 1 : -1;
	for (let i = 0; i < list.length; i++) {
		const candidate = list[next];
		if (candidate && !candidate.disabled) {
			select(candidate, next);
			const el = (e.currentTarget as HTMLElement)?.parentElement?.children[next] as HTMLElement | undefined;
			el?.focus();
			return;
		}
		next = (next + dir + list.length) % list.length;
	}
}

import A from "aberdeen";
import { type Bindable, type Slot, type Attributes, drawSlot, uniqueId } from "../core.js";

/** A single tab definition. */
export interface Tab {
	/** Stable id used as the selection value. Falls back to the array index. */
	id?: string;
	/** Tab label shown in the tab strip. */
	label: Slot;
	/** Optional leading icon. */
	icon?: Slot;
	/** Content rendered in the panel when this tab is active. A string is rendered as rich text. */
	content?: Slot;
	/** Disables selecting this tab. */
	disabled?: boolean;
}

/** Options for {@link tabs}. */
export interface TabsOptions {
	/** Aberdeen attr/style string applied to the outermost element. */
	attrs?: Attributes;
	/** The tabs to display. */
	tabs: Tab[];
	/**
	 * Two-way binding for the selected tab's id. When omitted, the component keeps
	 * its own internal selection, starting at the first tab.
	 */
	bind?: Bindable<string>;
	/** Aberdeen attr/style string applied to the active panel. */
	contentAttrs?: Attributes;
}

A.insertGlobalCss({
	".s-tabs": {
		"&": "display:flex flex-direction:column gap:$3",
		".s-tablist": "display:flex gap:$1 align-items:stretch overflow-x:auto scrollbar-width:none border-bottom: 1px solid $s-border;",
		".s-tablist::-webkit-scrollbar": "display:none",
		".s-tab":
			"display:inline-flex align-items:center gap:$2 cursor:pointer background:transparent " +
			"border:0 color: $s-fg-muted; font-weight:600 padding: 0.6em 0.9em; " +
			"border-bottom: 3px solid transparent; margin-bottom:-1px " +
			"transition: color 0.15s, background 0.15s, border-color 0.15s;",
		".s-tab:hover:not(:disabled), .s-tab[aria-selected=true]": "color: $s-fg;",
".s-tab:focus-visible": "outline:none box-shadow: 0 0 0 3px $s-focus; r: $s-radius;",
		".s-tab[aria-selected=true]": "border-image: $s-gradient 1;",
		".s-tabpanel": "display:block",
	},
});

/**
 * A tabbed view. Renders an ARIA `tablist` of buttons and a single live panel
 * for the selected tab. Supports keyboard navigation (left/right/home/end).
 *
 * @example
 * ```ts
 * S.tabs({ tabs: [
 *   { label: "Overview", content: () => A("p#Let me give you an overview..") },
 *   { label: "Settings", content: () => S.checkbox({label: "I agree to anything", checked: true}) },
 * ]});
 * ```
 */
export function tabs(opts: TabsOptions): void {
	const groupId = uniqueId("tabs");

	// Resolve a tab's selection key (its id, or its index as a string).
	const keyOf = (tab: Tab, index: number) => tab.id ?? String(index);

	// Selection state: caller-provided binding, or internal.
	const $sel: Bindable<string> = opts.bind ?? A.proxy(keyOf(opts.tabs[0] ?? { label: "" }, 0));

	// If the current value isn't a valid tab key, reset to the first tab.
	if (opts.tabs.length > 0 && !opts.tabs.some((t, i) => keyOf(t, i) === A.peek(() => $sel.value))) {
		$sel.value = keyOf(opts.tabs[0], 0);
	}

	const select = (tab: Tab, index: number) => {
		if (tab.disabled) return;
		$sel.value = keyOf(tab, index);
	};

	A("div.s-tabs", opts.attrs, () => {
		A("div.s-tablist role=tablist", () => {
			opts.tabs.forEach((tab, index) => {
				const key = keyOf(tab, index);
				A("button.s-tab type=button role=tab", () => {
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

		A("div.s-tabpanel role=tabpanel", opts.contentAttrs, () => {
			A(() => {
				const selKey = $sel.value;
				const index = opts.tabs.findIndex((t, i) => keyOf(t, i) === selKey);
				const tab = opts.tabs[index] ?? opts.tabs[0];
				if (!tab) return;
				A(`id=${groupId}-panel-${keyOf(tab, index)} aria-labelledby=${groupId}-tab-${keyOf(tab, index)}`);
				drawSlot(tab.content);
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

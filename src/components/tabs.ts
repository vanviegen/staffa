import A from "aberdeen";
import { type Bindable, type Slot, type Attributes, drawSlot, uniqueId } from "../core.js";
import { mk } from "../icons-helpers.js";

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

// Chevrons for the scroll buttons, as inline SVG (the icon set's own helper, so
// no icon data comes along) rather than `‹`/`›` characters — matching Lucide's
// `chevron-left`/`chevron-right`.
const chevronLeft = mk('<path d="m15 18-6-6 6-6"/>');
const chevronRight = mk('<path d="m9 18 6-6-6-6"/>');

A.insertGlobalCss({
	".s-tabs": {
		"&": "display:flex flex-direction:column gap:$3",
		// The bar owns the hairline (so it runs the full width, under the scroll
		// buttons too) and is the positioning context they overlay from.
		".s-tabbar": "position:relative display:flex border-bottom: 1px solid $s-faint;",
		// The strip scrolls horizontally when the tabs outgrow it. Its own scrollbar
		// is hidden — a raw scrollbar under a tab row reads as a mistake — so the
		// affordance is the pair of buttons below, plus the fade they sit in.
		// `overflow-y:hidden` is load-bearing: `overflow-x:auto` alone forces the
		// computed `overflow-y` off `visible`, which turned the active tab's 1px
		// overhang into a stray couple of pixels of *vertical* scroll.
		".s-tablist":
			"display:flex gap:$1 align-items:stretch flex:1 min-width:0 " +
			"overflow-x:auto overflow-y:hidden scrollbar-width:none scroll-behavior:smooth " +
			// Pulls the strip 1px down over the bar's hairline, so the active tab's
			// underline lands *on* it rather than stacking above it. On the strip, not
			// the tabs: a negative margin inside a scroll container is overflow.
			"margin-bottom:-1px",
		".s-tablist::-webkit-scrollbar": "display:none",
		".s-tab":
			"display:inline-flex align-items:center gap:$2 cursor:pointer background:transparent " +
			"border:0 color: $s-muted; font-weight:600 padding: 0.6em 0.9em; white-space:nowrap " +
			"border-bottom: 3px solid transparent; " +
			"transition: color 0.15s, background 0.15s, border-color 0.15s;",
		".s-tab:hover:not(:disabled), .s-tab[aria-selected=true]": "color: $s-text;",
		// An inset ring: the strip is a scroll container, so it clips its own
		// painting, and an outset ring on the first/last tab would be shaved off.
		".s-tab:focus-visible": "outline:none box-shadow: inset 0 0 0 2px $s-focus; r: $s-radius;",
		".s-tab[aria-selected=true]": "border-image: $s-gradient 1;",
		// The scroll buttons overlay the strip's ends rather than sitting beside it,
		// so no width is reserved when there's nothing to scroll — and the tabs slide
		// out from under a fade instead of stopping at a hard edge.
		".s-tabscroll":
			"position:absolute top:0 bottom:0 z-index:1 display:none align-items:center justify-content:center " +
			"width:2.4em border:0 padding:0 cursor:pointer fg:$s-muted " +
			"transition: color 0.15s;",
		".s-tabscroll:hover": "fg:$s-text",
		".s-tabscroll-left": "left:0 justify-content:flex-start background: linear-gradient(to right, $s-bg 45%, transparent)",
		".s-tabscroll-right": "right:0 justify-content:flex-end background: linear-gradient(to left, $s-bg 45%, transparent)",
		// Shown only for the direction there is actually something to scroll towards,
		// so the pair doubles as a position indicator.
		".s-tabbar.s-can-left > .s-tabscroll-left, .s-tabbar.s-can-right > .s-tabscroll-right": "display:flex",
		".s-tabpanel": "display:block",
	},
});

/**
 * A tabbed view. Renders an ARIA `tablist` of buttons and a single live panel
 * for the selected tab. Supports keyboard navigation (left/right/home/end).
 *
 * More tabs than fit make the strip scroll sideways, with a ‹ / › button
 * appearing over whichever end still has something to reach — a bare scroll area
 * says nothing about itself to a mouse. Selecting a tab that's out of view
 * (arrow keys, or a `bind` written from elsewhere) scrolls it back in.
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
		A("div.s-tabbar", () => {
			const listEl = A("div.s-tablist role=tablist", () => {
				opts.tabs.forEach((tab, index) => {
					const key = keyOf(tab, index);
					const tabEl = A("button.s-tab type=button role=tab", () => {
						A(`id=${groupId}-tab-${key} aria-controls=${groupId}-panel-${key}`);
						A(() => {
							const selected = $sel.value === key;
							A("aria-selected=", selected ? "true" : "false");
							A("tabindex=", selected ? "0" : "-1");
							// Selecting a tab that's (partly) scrolled out brings it into
							// view, so the strip follows the selection however it was made:
							// a click, the arrow keys, or a `bind` written from elsewhere.
							if (selected) requestAnimationFrame(() => reveal(tabEl as HTMLElement));
						});
						if (tab.disabled) A("disabled=true");
						A("click=", () => select(tab, index));
						A("keydown=", (e: KeyboardEvent) => onKey(e, opts.tabs, index, select));
						drawSlot(tab.icon);
						drawSlot(tab.label);
					});
				});
			}) as HTMLElement;

			drawScrollButton(listEl, -1);
			drawScrollButton(listEl, 1);
			watchScroll(listEl);
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

/**
 * One of the two scroll buttons overlaying the ends of the strip. `dir` is -1 for
 * the left one and 1 for the right. A page at a time (not a tab at a time): the
 * strip scrolls smoothly, so a nudge that moved one tab would read as a twitch.
 */
function drawScrollButton(list: HTMLElement, dir: -1 | 1): void {
	A(`button.s-tabscroll.s-tabscroll-${dir < 0 ? "left" : "right"} type=button`, () => {
		// The tabs themselves are the real control; this is a convenience the strip
		// offers a mouse. Keeping it out of the tab order means Tab still steps from
		// the tablist straight into the panel.
		A("tabindex=-1 aria-hidden=true");
		A("click=", () => list.scrollBy({ left: dir * list.clientWidth * 0.8, behavior: "smooth" }));
		(dir < 0 ? chevronLeft : chevronRight)({ size: "1.1em" });
	});
}

/**
 * Keep the `.s-can-left` / `.s-can-right` classes on the bar in step with what
 * there is left to scroll towards, so each button appears exactly when it has
 * somewhere to go. Watches the strip's own scrolling *and* its size (a resize, or
 * tabs being added or removed, changes the answer without any scrolling at all).
 */
function watchScroll(list: HTMLElement): void {
	const bar = list.parentElement;
	if (!bar || typeof ResizeObserver === "undefined") return; // No-op outside the browser.
	const update = () => {
		// A sub-pixel slack: fractional layout widths otherwise leave a permanent
		// half-pixel of "scrollable" at an end that is plainly already reached.
		const max = list.scrollWidth - list.clientWidth;
		bar.classList.toggle("s-can-left", list.scrollLeft > 1);
		bar.classList.toggle("s-can-right", list.scrollLeft < max - 1);
	};
	list.addEventListener("scroll", update, { passive: true });
	const ro = new ResizeObserver(update);
	ro.observe(list);
	for (const tab of Array.from(list.children)) ro.observe(tab);
	update();
	A.clean(() => {
		list.removeEventListener("scroll", update);
		ro.disconnect();
	});
}

/** Scroll `el`'s strip just far enough to clear the buttons overlaying its ends. */
function reveal(el: HTMLElement): void {
	const list = el.parentElement;
	if (!list || !el.isConnected) return;
	// The overlays are 2.4em wide; clearing a little more than that keeps the tab
	// from sitting right against one.
	const pad = parseFloat(getComputedStyle(list).fontSize) * 2.6;
	const tab = el.getBoundingClientRect(), strip = list.getBoundingClientRect();
	if (tab.left < strip.left + pad) list.scrollBy({ left: tab.left - strip.left - pad, behavior: "smooth" });
	else if (tab.right > strip.right - pad) list.scrollBy({ left: tab.right - strip.right + pad, behavior: "smooth" });
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

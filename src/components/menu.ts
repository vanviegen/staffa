import A from "aberdeen";
import { type Slot, type Attributes, drawSlot } from "../core.js";
import { button, type ButtonOptions } from "./button.js";

/** A clickable item in a menu. */
export interface MenuItem {
	/** Label text or draw function. Strings are rendered as rich text. */
	label: Slot;
	/** Leading icon drawn before the label. */
	icon?: Slot;
	/** Click handler. */
	click?: (e: Event) => void;
	/** Render as a link (`<a role=menuitem>`) pointing here. */
	href?: string;
	/** `target` for the link (`_blank`, etc.). Only meaningful with `href`. */
	target?: string;
	/** Disables the item. */
	disabled?: boolean;
	/** Aberdeen attr/style string on the item element. */
	attrs?: Attributes;
}

/** A visual divider between groups of items. */
export interface MenuSeparator {
	separator: true;
}

export type MenuEntry = MenuItem | MenuSeparator;

/** Options for {@link menu}. */
export interface MenuOptions {
	/** Items shown in the dropdown. */
	items: MenuEntry[];
	/**
	 * Customise the trigger button. If omitted, a `☰` icon button is rendered.
	 * The `click` handler is managed internally — do not set it here.
	 */
	trigger?: ButtonOptions;
	/** Aberdeen attr/style string on the dropdown list panel. */
	attrs?: Attributes;
}

A.insertGlobalCss({
	".s-menu-list": {
		"&":
			"position:fixed z-index:350 min-width:10rem " +
			"list-style:none p:$1 m:0 " +
			"border: 1px solid $s-border; r:$s-radius-lg box-shadow:$s-shadow " +
			"overflow-y:auto max-height:min(80vh,28rem) " +
			"transition: opacity 0.15s, transform 0.15s;",
		"&.hidden": "opacity:0 pointer-events:none transform:translateY(-6px)",
		".s-menu-item, .s-menu-item-link":
			"display:flex align-items:center gap:$2 w:100% " +
			"padding: 0.45em 0.65em; r:6px cursor:pointer text-align:left " +
			"font-size:0.9em border:0 background:transparent fg:$s-fg text-decoration:none " +
			"transition: background 0.1s;",
		".s-menu-item:hover:not([aria-disabled=true]), .s-menu-item-link:hover":
			"background: color-mix(in oklab, $s-fg, $s-bg 90%);",
		".s-menu-item:focus-visible, .s-menu-item-link:focus-visible":
			"outline:none background: color-mix(in oklab, $s-fg, $s-bg 90%); box-shadow: 0 0 0 2px inset $s-focus;",
		".s-menu-item[aria-disabled=true], .s-menu-item-link[aria-disabled=true]":
			"opacity:0.45 cursor:not-allowed",
		".s-menu-icon": "fg:$s-fg-muted flex-shrink:0",
		".s-menu-sep": "border:0 border-top: 1px solid $s-border; margin: $1 0;",
	},
});

// ─── Global portal state ────────────────────────────────────────────────────

interface ActiveMenu {
	id: number;
	tx: number; // trigger left
	ty: number; // trigger top
	tw: number; // trigger width
	th: number; // trigger height
	activeIdx: number; // focused item index (into opts.items), -1 = none
}

const menuRegistry = new Map<number, MenuOptions>();
let menuSeq = 0;
const $active = A.proxy<ActiveMenu>({ id: 0, tx: 0, ty: 0, tw: 0, th: 0, activeIdx: -1 });
let activeTriggerFocus: (() => void) | null = null;

function closeMenu(): void {
	if (!$active.id) return;
	$active.id = 0;
	$active.activeIdx = -1;
	const refocus = activeTriggerFocus;
	activeTriggerFocus = null;
	refocus?.();
}

function positionMenu(menuEl: HTMLElement, tx: number, ty: number, tw: number, th: number): void {
	const mw = menuEl.offsetWidth;
	const mh = menuEl.offsetHeight;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const gap = 4;

	// Horizontal: start-aligned by default, shift left if overflows right edge.
	let x = tx;
	if (x + mw > vw - 8) x = Math.max(8, tx + tw - mw);

	// Vertical: below trigger by default; flip above if not enough space below.
	let y = ty + th + gap;
	if (y + mh > vh - 8 && ty - mh - gap >= 8) {
		y = ty - mh - gap;
	}

	menuEl.style.left = Math.max(8, x) + "px";
	menuEl.style.top = Math.max(8, y) + "px";
}

// ─── Portal ─────────────────────────────────────────────────────────────────

A.mount(document.body, () => {
	A(() => {
		const id = $active.id;
		if (!id) return;
		const opts = menuRegistry.get(id);
		if (!opts) return;

		// Invisible full-screen backdrop catches outside clicks.
		A("div position:fixed inset:0 z-index:349", () => {
			A("click=", closeMenu);
		});

		// Collect interactive element refs for programmatic focus.
		const itemEls: (HTMLElement | null)[] = [];

		const menuEl = A("ul.s-menu-list.s-s.panel create=hidden destroy=hidden", opts.attrs, () => {
			A("keydown=", handleKeyDown);

			opts.items.forEach((entry, i) => {
				if ("separator" in entry) {
					itemEls.push(null);
					A("li.s-menu-sep role=none");
					return;
				}

				let el: HTMLElement;
				if (entry.href) {
					A("li role=none", () => {
						el = A(
							"a.s-menu-item-link role=menuitem tabindex=-1",
							entry.attrs,
							() => {
								A("href=", entry.href!);
								if (entry.target) A("target=", entry.target);
								if (entry.disabled) A("aria-disabled=true");
								renderItemContent(entry, i);
							},
						) as HTMLElement;
					});
				} else {
					el = A("li.s-menu-item role=menuitem tabindex=-1", entry.attrs, () => {
						if (entry.disabled) A("aria-disabled=true");
						A(() => {
							// Only this tiny scope re-runs on keyboard navigation.
							A("tabindex=", $active.activeIdx === i ? "0" : "-1");
						});
						renderItemContent(entry, i);
						A("click=", (e: Event) => {
							if (entry.disabled) return;
							closeMenu();
							entry.click?.(e);
						});
					}) as HTMLElement;
				}
				itemEls.push(el!);
			});
		}) as HTMLElement;

		// After layout: position and focus the first item.
		requestAnimationFrame(() => {
			if (!document.body.contains(menuEl)) return;
			const { tx, ty, tw, th } = $active;
			positionMenu(menuEl, tx, ty, tw, th);
			// Focus the first enabled item.
			const firstIdx = opts.items.findIndex(
				(e) => !("separator" in e) && !(e as MenuItem).disabled,
			);
			if (firstIdx >= 0) {
				$active.activeIdx = firstIdx;
				itemEls[firstIdx]?.focus();
			}
		});

		function handleKeyDown(e: KeyboardEvent): void {
			const items = opts!.items;
			const idx = $active.activeIdx;

			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const dir = e.key === "ArrowDown" ? 1 : -1;
				let next = idx < 0 ? (dir > 0 ? -1 : items.length) : idx;
				for (let step = 0; step < items.length; step++) {
					next = (next + dir + items.length) % items.length;
					const item = items[next];
					if (item && !("separator" in item) && !(item as MenuItem).disabled) break;
				}
				$active.activeIdx = next;
				itemEls[next]?.focus();
			} else if (e.key === "Home") {
				e.preventDefault();
				const first = items.findIndex((e) => !("separator" in e) && !(e as MenuItem).disabled);
				if (first >= 0) { $active.activeIdx = first; itemEls[first]?.focus(); }
			} else if (e.key === "End") {
				e.preventDefault();
				let last = -1;
				for (let i = items.length - 1; i >= 0; i--) {
					if (!("separator" in items[i]!) && !(items[i] as MenuItem).disabled) { last = i; break; }
				}
				if (last >= 0) { $active.activeIdx = last; itemEls[last]?.focus(); }
			} else if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				const item = items[idx];
				if (item && !("separator" in item) && !(item as MenuItem).disabled) {
					closeMenu();
					(item as MenuItem).click?.({ type: "click" } as Event);
				}
			} else if (e.key === "Escape" || e.key === "Tab") {
				e.preventDefault();
				closeMenu();
			}
		}
	});
});

function renderItemContent(entry: MenuItem, _i: number): void {
	if (entry.icon) A("span.s-menu-icon", () => drawSlot(entry.icon));
	drawSlot(entry.label);
}

// ─── Public component ────────────────────────────────────────────────────────

/**
 * A button that opens a positioned dropdown menu. The dropdown is portaled to
 * `document.body` so it always appears above other content regardless of
 * stacking context. Keyboard navigation follows the WAI-ARIA menu pattern:
 * Arrow Up/Down, Home, End, Enter/Space to activate, Escape to close.
 *
 * @example
 * ```ts
 * S.menu({
 *   trigger: { text: "Actions", attrs: ".neutral .outlined" },
 *   items: [
 *     { label: "Edit", icon: () => A("#✎"), click: () => edit() },
 *     { label: "Duplicate", click: () => dupe() },
 *     { separator: true },
 *     { label: "Delete", attrs: "fg:$s-danger", click: () => del() },
 *   ],
 * });
 * ```
 */
export function menu(opts: MenuOptions): void {
	const menuId = ++menuSeq;
	menuRegistry.set(menuId, opts);

	A.clean(() => {
		menuRegistry.delete(menuId);
		if ($active.id === menuId) closeMenu();
	});

	button({
		icon: () => A("span aria-hidden=true #☰"),
		ariaLabel: "Open menu",
		attrs: ".neutral .outlined",
		...opts.trigger,
		click: (e: Event) => {
			if ($active.id === menuId) {
				closeMenu();
				return;
			}
			const el = e.currentTarget as HTMLElement;
			activeTriggerFocus = () => el.focus();
			const rect = el.getBoundingClientRect();
			$active.id = menuId;
			$active.tx = rect.left;
			$active.ty = rect.top;
			$active.tw = rect.width;
			$active.th = rect.height;
			$active.activeIdx = -1;
		},
	});
}

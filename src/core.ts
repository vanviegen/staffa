import A from "aberdeen";

/**
 * Shared building blocks for the Staffa component library: the option-type
 * hierarchy every component builds on, plus a couple of tiny helpers. A
 * component is just an Aberdeen draw function — one typed options object in,
 * DOM out through {@link A}.
 */

/**
 * An Aberdeen attribute/style/class string, e.g. `"display:flex gap:$3 .my-class"`.
 * 
 * Common values are our surface modifier classes:
 * - neutral surface: `.neutral` (shade steps with nesting depth)
 * - accent surface: `.primary` `.danger` `.success` `.warning` and `.link`
 * - accent variant: `.filled` `.tonal` and `.outlined`
 *
 * These strings are passed straight through to {@link A} as positional
 * arguments, so they accept the full Aberdeen shorthand syntax: CSS shortcuts
 * (`p`, `mt`, `bg`, `r`, ...), spacing variables (`$1`..`$12`), CSS custom
 * properties (`$s-primary`), classes (`.foo`) and attributes (`aria-label=Hi`).
 *
 * Note: because Aberdeen interprets a leading bare word as an element name, write
 * `display:flex` rather than just `flex`.
 */
export type Attributes = string;

/** A reactive "value box", such as the result of `A.proxy(x)` or `A.ref(obj, key)`. */
export type Bindable<T> = { value: T };

/**
 * Something that renders a small piece of content: either a plain string or a
 * draw function (for icons, badges, custom markup, ...).
 *
 * A string is drawn as **rich text** (see {@link drawSlot}): Aberdeen's `rich`
 * markup is applied, so `*italic*`, `**bold**`, `` `code` `` and
 * `[links](/path)` render as inline elements (text is safely escaped).
 *
 * The optional `Args` type parameter lets a slot's draw-function receive
 * arguments — e.g. a dialog body is a `Slot<[close: () => void]>`.
 */
export type Slot<Args extends unknown[] = []> = string | ((...args: Args) => void);

/**
 * Options for components that wrap a single block of caller-provided content,
 * with an `attrs` escape hatch on the outermost element.
 */
export interface ContentOptions {
	/** Aberdeen attr/style string applied to the widget's outermost element. */
	attrs?: Attributes;
	/** Draws the children of this component. A string is rendered as rich text. */
	content?: Slot;
}

/**
 * Shell width — not viewport width — at or below which the app shell goes
 * "narrow": the nav sidebar collapses to a hamburger, and a routed shell has room
 * for exactly one full-bleed column. Shared by the `@container` queries that do
 * the switching and by the JS that has to agree with them.
 */
export const NARROW_PX = 640;

let idCounter = 0;
/** Generates a process-unique id, used to wire `<label for>` to its control. */
export function uniqueId(prefix = "s"): string {
	return `${prefix}-${++idCounter}`;
}

/**
 * Draw a {@link Slot} into the current element: call it (with any extra `args`)
 * if it's a function, otherwise emit the string as **rich text** via Aberdeen's
 * `rich` markup (`*italic*`, `**bold**`, `` `code` ``, `[link](/path)`).
 */
export function drawSlot<Args extends unknown[] = []>(slot: Slot<Args> | undefined, ...args: Args): void {
	if (slot == null) return;
	if (typeof slot === "function") slot(...args);
	else A("rich=", slot);
}

/** Selector matching the natively focusable elements we care about. */
const FOCUSABLE_SELECTOR = "a[href], button, input, select, textarea, [tabindex]";

/**
 * Move keyboard focus to the first focusable element inside `container`, skipping
 * disabled, `aria-disabled`, `tabindex=-1` and hidden ones. A `prefer` selector,
 * where it matches a focusable element, wins — e.g. a menu's current item.
 * Returns whether anything was focused.
 *
 * Shared by the overlays (floating menu, dialogs). Call it once the element is in
 * the DOM and laid out — typically inside a `requestAnimationFrame`.
 */
export function focusFirst(container: HTMLElement, prefer?: string): boolean {
	const ok = (el: Element): el is HTMLElement =>
		el instanceof HTMLElement &&
		!el.hasAttribute("disabled") &&
		el.getAttribute("aria-disabled") !== "true" &&
		el.tabIndex >= 0 &&
		el.getClientRects().length > 0;
	const target =
		(prefer ? [...container.querySelectorAll(prefer)].find(ok) : undefined) ??
		[...container.querySelectorAll(FOCUSABLE_SELECTOR)].find(ok);
	target?.focus();
	return target != null;
}

/**
 * Mount a portal (tooltip, toast, menu, dialog, …) directly into `<body>`.
 * Must be called at module top level, where Aberdeen's root scope (whose element
 * is `document.body`) is current: sibling scopes there track their positions, so
 * portals coexist without wrapper elements — separate `A.mount`s sharing a parent
 * could not. Scope creation is deferred a microtask, so an app drawing into
 * `<body>` gets its content first and the overlays stay at the end.
 */
export function mountPortal(draw: () => void): void {
	queueMicrotask(() => A(draw));
}

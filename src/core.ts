import A from "aberdeen";

/**
 * Shared building blocks for the Staffa component library.
 *
 * Every component in Staffa is "just an Aberdeen draw function": a plain function
 * that takes a single, strongly typed options object and emits DOM through
 * Aberdeen's {@link A} function. This module defines the option-type hierarchy
 * that all components build on, plus a couple of tiny helpers.
 */

/**
 * An Aberdeen attribute/style/class string, e.g. `"display:flex gap:$3 .my-class"`.
 * 
 * Common values are our surface modifier classes:
 * - for colors: `.panel` `.raised` `.neutral` `.primary` `.danger` `.success` and `.warning`
 * - for variant: `.filled` `.tonal` and `.outlined`
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

/** A content function. It runs inside the relevant element's reactive scope. */
export type Content = () => void;

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
	/** Draws the children of this component. */
	content?: Content;
}

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

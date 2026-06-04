import A from "aberdeen";

/**
 * Shared building blocks for the Skye component library.
 *
 * Every component in Skye is "just an Aberdeen draw function": a plain function
 * that takes a single, strongly typed options object and emits DOM through
 * Aberdeen's {@link A} function. This module defines the option-type hierarchy
 * that all components build on, plus a couple of tiny helpers.
 */

/**
 * An Aberdeen attribute/style/class string, e.g. `"display:flex gap:$3 .my-class"`.
 *
 * These strings are passed straight through to {@link A} as positional
 * arguments, so they accept the full Aberdeen shorthand syntax: CSS shortcuts
 * (`p`, `mt`, `bg`, `r`, ...), spacing variables (`$1`..`$12`), CSS custom
 * properties (`$sPrimary`), classes (`.foo`) and attributes (`aria-label=Hi`).
 *
 * Note: because Aberdeen interprets a leading bare word as an element name, write
 * `display:flex` rather than just `flex`.
 */
export type Styling = string;

/** A reactive "value box", such as the result of `A.proxy(x)` or `A.ref(obj, key)`. */
export type Bindable<T> = { value: T };

/** A content function. It runs inside the relevant element's reactive scope. */
export type Content = () => void;

/**
 * Something that renders a small piece of content: either a plain string (drawn
 * as a text node) or a draw function (for icons, badges, custom markup, ...).
 */
export type Slot = string | Content;

/**
 * Options shared by *every* Skye component.
 *
 * The {@link BaseOptions.root | root} string is applied to the outermost element
 * of the widget, letting callers tweak layout, spacing or add classes without
 * forking the component.
 */
export interface BaseOptions {
	/**
	 * Aberdeen attr/style string applied to the widget's root element.
	 *
	 * It is passed as a positional argument to {@link A}, so a *change* to it on a
	 * proxied options object re-runs the caller's scope (recreating the widget).
	 * That's fine for `root` — it rarely changes at runtime.
	 */
	root?: Styling;
}

/**
 * Options for components that wrap a single block of caller-provided content.
 *
 * Such components render an *inner* element (the one that actually holds the
 * children) which is given sensible default padding and `gap` in CSS. Override
 * those via {@link ContentOptions.inner | inner}, whose declarations win because
 * they're applied as inline styles.
 */
export interface ContentOptions extends BaseOptions {
	/** Draws the children of this component. */
	content?: Content;
	/**
	 * Aberdeen attr/style string applied to the inner (content-holding) element.
	 * Add `display:flex` here if you want the children laid out as a flex
	 * row/column.
	 */
	inner?: Styling;
}

let idCounter = 0;
/** Generates a process-unique id, used to wire `<label for>` to its control. */
export function uniqueId(prefix = "s"): string {
	return `${prefix}-${++idCounter}`;
}

/**
 * Draw a {@link Slot} into the current element: call it if it's a function,
 * otherwise emit it as a text node.
 */
export function drawSlot(slot: Slot | undefined): void {
	if (slot == null) return;
	if (typeof slot === "function") slot();
	else A("#", slot);
}

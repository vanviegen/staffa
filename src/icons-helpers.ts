import A from "aberdeen";

/** Stroke line-cap, as accepted by SVG's `stroke-linecap`. */
export type IconCap = "butt" | "round" | "square";
/** Stroke line-join, as accepted by SVG's `stroke-linejoin`. */
export type IconJoin = "arcs" | "bevel" | "miter" | "miter-clip" | "round";

/** Per-call overrides for a drawn icon. Anything omitted falls back to the
 * module defaults (see {@link setDefaults}). */
export interface IconOptions {
	/** Width & height, as a CSS length. A bare number is treated as pixels by
	 * SVG. Pass e.g. `"1em"` to scale the icon with the surrounding font. */
	size?: number | string;
	/** Stroke colour. Defaults to `"currentColor"`, so the icon inherits the
	 * current text colour. */
	color?: string;
	/** Stroke width in viewBox units (the viewBox is 24×24). */
	strokeWidth?: number;
	/** Stroke line-cap. */
	cap?: IconCap;
	/** Stroke line-join. */
	join?: IconJoin;
	/** Aberdeen attr/style string applied to the `<svg>` element. */
	attrs?: string;
}

/** The resolved, always-present defaults backing {@link IconOptions}. */
export interface IconDefaults {
	size: number | string;
	color: string;
	strokeWidth: number;
	cap: IconCap;
	join: IconJoin;
}

const defaults: IconDefaults = {
	size: 24,
	color: "currentColor",
	strokeWidth: 2,
	cap: "round",
	join: "round",
};

/**
 * Override the module-wide icon defaults. Affects every icon drawn afterwards.
 *
 * @example
 * ```ts
 * import { setDefaults } from "staffa/icons";
 * setDefaults({ size: "1.25em", strokeWidth: 1.5 });
 * ```
 */
export function setDefaults(opts: Partial<IconDefaults>): void {
	Object.assign(defaults, opts);
}

/**
 * Draw a single icon: build one `<svg>` through Aberdeen (applying the
 * {@link IconOptions} or the module defaults) and fill in its inner markup.
 *
 * This is the shared body behind every icon. {@link mk} hands it the icon's
 * `inner` markup, so the per-icon closures stay tiny instead of each carrying
 * a copy of this logic.
 */
function drawIcon(inner: string, opts: IconOptions): void {
	const size = opts.size ?? defaults.size;
	const el = A(
		'svg.s-icon aria-hidden=true viewBox="0 0 24 24" fill=none',
		"width=", size,
		"height=", size,
		"stroke=", opts.color ?? defaults.color,
		"stroke-width=", opts.strokeWidth ?? defaults.strokeWidth,
		"stroke-linecap=", opts.cap ?? defaults.cap,
		"stroke-linejoin=", opts.join ?? defaults.join,
		opts.attrs,
	) as SVGSVGElement;
	// Drop the primitives in via innerHTML: setting it on the `<svg>` itself
	// makes the parser put the children in the SVG namespace. (Aberdeen's
	// `html=` builds them in the HTML namespace, leaving them non-rendering.)
	el.innerHTML = inner;
}

/**
 * Turn a piece of inner-SVG markup into an icon draw-function. The returned
 * function emits a freshly-built `<svg>` into the current Aberdeen scope,
 * applying the {@link IconOptions} (or the module defaults).
 */
export function mk(inner: string): (opts?: IconOptions) => void {
	return (opts: IconOptions = {}) => drawIcon(inner, opts);
}

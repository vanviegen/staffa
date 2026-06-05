import A from "aberdeen";
import { type BaseOptions, type Content, type Slot, type Styling, drawSlot } from "../core.js";

/**
 * Visual weight of a button.
 * - `filled`: solid background, highest emphasis.
 * - `tonal`: soft tinted background, medium emphasis.
 * - `outlined`: bordered, transparent background, lowest emphasis.
 *
 * Every variant carries at least a visible border, per Staffa's "everything is
 * legible at a glance" principle.
 */
export type ButtonVariant = "filled" | "tonal" | "outlined";

/**
 * Color of a button.
 *
 * The four named **semantic roles** map to theme colours and are offered as
 * autocomplete suggestions. You may also pass *any* CSS colour the browser
 * understands and it becomes the button's accent directly: a literal like
 * `"#ef6b00"` / `"rgb(255 107 0)"`, or a theme custom-property reference like
 * `"$sWarning"` (Aberdeen's `$name` shorthand for `var(--name)`).
 *
 * The `(string & {})` member is what keeps the literal suggestions visible while
 * still allowing arbitrary strings — TypeScript only widens to `string` lazily.
 */
export type ButtonColor = "primary" | "neutral" | "danger" | "success" | (string & {});

/** Options for {@link button}. */
export interface ButtonOptions extends BaseOptions {
	/** Button label text. */
	text?: string;
	/** Custom content (overrides {@link ButtonOptions.text | text}). */
	content?: Content;
	/** Leading icon/adornment, drawn before the label. */
	icon?: Slot;
	/** Click handler. */
	click?: (event: Event) => void;
	/** Visual weight. Defaults to `"filled"`. */
	variant?: ButtonVariant;
	/** Color role. Defaults to `"primary"`. */
	color?: ButtonColor;
	/** Size. Defaults to `"md"`. */
	size?: "sm" | "md" | "lg";
	/** Disables the button. */
	disabled?: boolean;
	/** Native button behaviour. Defaults to `"button"`. */
	type?: "button" | "submit" | "reset";
	/** Render as a link (`<a role=button>`) pointing here instead of a `<button>`. */
	href?: string;
	/** Accessible label, when the button has only an icon. */
	ariaLabel?: string;
	/** Aberdeen attr/style string applied to the button element. */
	inner?: Styling;
}

// The color role sets a local `--c` (and `--cfg` for text on filled); the
// variant rules consume them, so we avoid writing colour×variant rules.
A.insertGlobalCss({
	".S_btn": {
		"&":
			"--c:$sPrimary --cfg:$sPrimaryFg " +
			"display:inline-flex align-items:center justify-content:center gap:$2 " +
			"font-weight:600 line-height:1.2 white-space:nowrap cursor:pointer text-decoration:none " +
			"border: 1px solid transparent; r:$sRadius padding: 0.5em 1em; " +
			"transition: background 0.15s, border-color 0.15s, filter 0.15s, box-shadow 0.15s;",
		"&:focus-visible": "outline:none box-shadow: 0 0 0 3px $sFocus;",
		"&:disabled, &[aria-disabled=true]": "opacity:0.45 cursor:not-allowed pointer-events:none filter:saturate(0.6)",
		// Colour roles.
		"&.S_neutral": "--c:$sBorderStrong --cfg:$sFg",
		"&.S_danger": "--c:$sDanger --cfg:#fff",
		"&.S_success": "--c:$sSuccess --cfg:#08110d",
		// Variants.
		"&.S_filled": "background:$c color:$cfg border-color:$c",
		"&.S_filled:hover": "filter:brightness(1.1)",
		"&.S_tonal": "color:$c background: color-mix(in srgb, $c 20%, transparent); border-color: color-mix(in srgb, $c 30%, transparent);",
		"&.S_tonal:hover": "background: color-mix(in srgb, $c 30%, transparent);",
		"&.S_outlined": "color:$c background:transparent border-color: color-mix(in srgb, $c 55%, $sBorder);",
		"&.S_outlined:hover": "background: color-mix(in srgb, $c 12%, transparent);",
		// Sizes.
		"&.S_sm": "padding: 0.32em 0.7em; font-size:0.85em",
		"&.S_lg": "padding: 0.66em 1.3em; font-size:1.1em",
	},
});

/**
 * A button. Always carries at least a visible border so its affordance is
 * obvious at a glance, regardless of {@link ButtonVariant | variant}.
 *
 * Shortcut: pass a string to use it as the label, or a function for custom
 * content.
 *
 * @example
 * ```ts
 * S.button({ text: "Save", click: save });
 * S.button({ text: "Delete", color: "danger", variant: "outlined", click: del });
 * S.button("Cancel");                        // shorthand for { text: "Cancel" }
 * S.button({ href: "/docs", text: "Docs" }); // renders an <a role=button>
 * ```
 */
export function button(opts: ButtonOptions | string | Content = {}): void {
	const o: ButtonOptions = typeof opts === "string" ? { text: opts } : typeof opts === "function" ? { content: opts } : opts;

	const tag = o.href != null ? "a" : "button";
	const variant = o.variant ?? "filled";
	const color = o.color ?? "primary";
	const size = o.size === "sm" || o.size === "lg" ? `.S_${o.size}` : "";

	// Semantic roles select a colour class (the CSS sets `--c`/`--cfg`); any other
	// value is a raw CSS colour we assign to `--c`, which the variant rules consume
	// via `var(--c)`. (`primary` is the base default — its class is a no-op.)
	const semantic = color === "primary" || color === "neutral" || color === "danger" || color === "success";
	const colorCls = semantic ? `.S_${color}` : "";

	const el = A(`${tag}.S_btn.S_${variant}${colorCls}${size}`, o.root, o.inner, () => {
		if (o.href != null) {
			A(`href=${o.href} role=button`);
			if (o.disabled) A("aria-disabled=true");
		} else {
			A("type=", o.type ?? "button");
			if (o.disabled) A("disabled=true");
		}
		if (o.ariaLabel) A("aria-label=", o.ariaLabel);
		if (o.click) A("click=", o.click);

		drawSlot(o.icon);
		if (o.content) o.content();
		else if (o.text != null) A("#", o.text);
	});

	// Aberdeen's inline styler doesn't set CSS custom properties, so assign the
	// custom accent on the element directly. A leading `$` is Aberdeen's shorthand
	// for a CSS variable reference, so expand it to `var(--name)`.
	if (!semantic && el instanceof HTMLElement) {
		el.style.setProperty("--c", color.startsWith("$") ? `var(--${color.slice(1)})` : color);
	}
}

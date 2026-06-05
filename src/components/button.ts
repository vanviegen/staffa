import A from "aberdeen";
import { type BaseOptions, type Content, type Slot, type Styling, drawSlot } from "../core.js";
import { type Look, lookClasses } from "../theme.js";

export type { Look };

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
	/**
	 * Visual look: a surface role with an optional modifier, e.g. `"primary"`,
	 * `"danger-tonal"`, `"neutral-outlined"`. Defaults to `"primary"` (filled).
	 */
	look?: Look;
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

// Color and modifier come entirely from the look's surface classes (defined in
// theme.ts). This rule only handles layout, border, focus, hover and sizing.
A.insertGlobalCss({
	".s-btn": {
		"&":
			"display:inline-flex align-items:center justify-content:center gap:$2 " +
			"font-weight:600 line-height:1.2 white-space:nowrap cursor:pointer text-decoration:none " +
			"border: 1px solid $s-border; r: $s-radius; padding: 0.5em 1em; " +
			"transition: background 0.15s, border-color 0.15s, filter 0.15s, box-shadow 0.15s;",
		"&:focus-visible": "outline:none box-shadow: 0 0 0 3px $s-focus;",
		"&:disabled, &[aria-disabled=true]": "opacity:0.45 cursor:not-allowed pointer-events:none filter:saturate(0.6)",
		"&:hover": "filter: brightness(1.08)",
		"&.s-tonal:hover, &.s-outlined:hover": "background: color-mix(in srgb, $s-b 26%, transparent);",
		"&.s-sm": "padding: 0.32em 0.7em; font-size:0.85em",
		"&.s-lg": "padding: 0.66em 1.3em; font-size:1.1em",
	},
});

/**
 * A button. Always carries at least a visible border so its affordance is
 * obvious at a glance.
 *
 * Shortcut: pass a string to use it as the label, or a function for custom
 * content.
 *
 * @example
 * ```ts
 * S.button({ text: "Save", click: save });
 * S.button({ text: "Delete", look: "danger-outlined", click: del });
 * S.button("Cancel");                        // shorthand for { text: "Cancel" }
 * S.button({ href: "/docs", text: "Docs" }); // renders an <a role=button>
 * ```
 */
export function button(opts: ButtonOptions | string | Content = {}): void {
	const o: ButtonOptions = typeof opts === "string" ? { text: opts } : typeof opts === "function" ? { content: opts } : opts;

	const tag = o.href != null ? "a" : "button";
	const lookCls = lookClasses(o.look);
	const sizeCls = o.size != null ? `.s-${o.size}` : "";

	A(`${tag}.s-btn${lookCls}${sizeCls}`, o.root, o.inner, () => {
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
}

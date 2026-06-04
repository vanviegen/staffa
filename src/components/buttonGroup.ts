import A from "aberdeen";
import type { ContentOptions } from "../core.js";
import { type ButtonOptions, button } from "./button.js";

/** Options for {@link buttonGroup}. */
export interface ButtonGroupOptions extends ContentOptions {
	/**
	 * Declarative list of buttons. Rendered in order. Alternatively (or
	 * additionally) draw buttons yourself via {@link ContentOptions.content}.
	 */
	buttons?: ButtonOptions[];
	/**
	 * `"attached"` (default) joins the buttons into a single segmented control
	 * with shared borders; `"spaced"` lays them out with a normal gap.
	 */
	layout?: "attached" | "spaced";
	/** Stack vertically instead of horizontally. */
	vertical?: boolean;
}

A.insertGlobalCss({
	".S_bgroup": {
		"&": "display:inline-flex align-items:stretch",
		"&.S_spaced": "gap:$2 flex-wrap:wrap",
		"&.S_vertical": "flex-direction:column",
		"&.S_attached": "gap:0",
		// When attached, collapse the shared border and square off the touching
		// corners, keeping only the outer ends of the group rounded.
		"&.S_attached:not(.S_vertical) > .S_btn:not(:first-child)": "margin-left:-1px",
		"&.S_attached:not(.S_vertical) > .S_btn:not(:first-child):not(:last-child)": "r:0",
		"&.S_attached:not(.S_vertical) > .S_btn:first-child:not(:last-child)": "border-top-right-radius:0 border-bottom-right-radius:0",
		"&.S_attached:not(.S_vertical) > .S_btn:last-child:not(:first-child)": "border-top-left-radius:0 border-bottom-left-radius:0",
		"&.S_attached.S_vertical > .S_btn:not(:first-child)": "margin-top:-1px",
		"&.S_attached.S_vertical > .S_btn:not(:first-child):not(:last-child)": "r:0",
		"&.S_attached.S_vertical > .S_btn:first-child:not(:last-child)": "border-bottom-left-radius:0 border-bottom-right-radius:0",
		"&.S_attached.S_vertical > .S_btn:last-child:not(:first-child)": "border-top-left-radius:0 border-top-right-radius:0",
		// Keep the hovered/focused button's border above its neighbours.
		"&.S_attached > .S_btn:hover, &.S_attached > .S_btn:focus-visible": "z-index:1",
	},
});

/**
 * Groups related buttons, either as a joined segmented control (`attached`) or
 * spaced out. A `role=group` is applied for assistive tech.
 *
 * @example
 * ```ts
 * S.buttonGroup({ buttons: [
 *   { text: "Day", variant: "outlined", color: "neutral" },
 *   { text: "Week", variant: "outlined", color: "neutral" },
 *   { text: "Month", variant: "outlined", color: "neutral" },
 * ]});
 * ```
 */
export function buttonGroup(opts: ButtonGroupOptions = {}): void {
	const layout = opts.layout ?? "attached";
	const cls = `.S_${layout}${opts.vertical ? ".S_vertical" : ""}`;

	A(`div.S_bgroup${cls} role=group`, opts.root, opts.inner, () => {
		if (opts.buttons) for (const b of opts.buttons) button(b);
		if (opts.content) opts.content();
	});
}

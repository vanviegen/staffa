import A from "aberdeen";
import type { ContentOptions } from "../core.js";
import { drawSlot } from "../core.js";
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
	".s-bgroup": {
		"&": "display:inline-flex align-items:stretch",
		"&.s-spaced": "gap:$2 flex-wrap:wrap",
		"&.s-vertical": "flex-direction:column",
		"&.s-attached": "gap:0",
		"&.s-attached:not(.s-vertical) > .s-btn:not(:first-child)": "margin-left:-1px",
		"&.s-attached:not(.s-vertical) > .s-btn:not(:first-child):not(:last-child)": "r:0",
		"&.s-attached:not(.s-vertical) > .s-btn:first-child:not(:last-child)": "border-top-right-radius:0 border-bottom-right-radius:0",
		"&.s-attached:not(.s-vertical) > .s-btn:last-child:not(:first-child)": "border-top-left-radius:0 border-bottom-left-radius:0",
		"&.s-attached.s-vertical > .s-btn:not(:first-child)": "margin-top:-1px",
		"&.s-attached.s-vertical > .s-btn:not(:first-child):not(:last-child)": "r:0",
		"&.s-attached.s-vertical > .s-btn:first-child:not(:last-child)": "border-bottom-left-radius:0 border-bottom-right-radius:0",
		"&.s-attached.s-vertical > .s-btn:last-child:not(:first-child)": "border-top-left-radius:0 border-top-right-radius:0",
		"&.s-attached > .s-btn:hover, &.s-attached > .s-btn:focus-visible": "z-index:1",
	},
});

/**
 * Groups related buttons, either as a joined segmented control (`attached`) or
 * spaced out. A `role=group` is applied for assistive tech.
 * 
 * If you want a single button to be *selected*, use {@link buttonChooser}.
 *
 * @example
 * ```ts
 * S.buttonGroup({ buttons: [
 *   { content: "Day", attrs: ".neutral .outlined" },
 *   { content: "Week", attrs: ".neutral .outlined" },
 *   { content: "Month", attrs: ".neutral .outlined" },
 * ]});
 * ```
 */
export function buttonGroup(opts: ButtonGroupOptions = {}): void {
	const layout = opts.layout ?? "attached";
	const cls = `.s-${layout}${opts.vertical ? ".s-vertical" : ""}`;

	A(`div.s-bgroup${cls} role=group`, opts.attrs, () => {
		if (opts.buttons) for (const b of opts.buttons) button(b);
		drawSlot(opts.content);
	});
}

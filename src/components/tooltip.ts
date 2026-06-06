import A from "aberdeen";
import { type Content, type Slot, type Attributes, drawSlot, uniqueId } from "../core.js";

/** Options for {@link tooltip}. */
export interface TooltipOptions {
	/** The tooltip text or draw function. A string is rendered as rich text. */
	tip: Slot;
	/** The element(s) the tooltip is attached to. */
	content: Content;
	/**
	 * Which side the tooltip appears on. Defaults to `"top"`.
	 * The tooltip stays on the chosen side — it does not auto-flip; set the side
	 * that has the most room in your layout.
	 */
	placement?: "top" | "bottom" | "left" | "right";
	/** Aberdeen attr/style string applied to the outermost wrapper element. */
	attrs?: Attributes;
}

A.insertGlobalCss({
	".s-tt": {
		// Wrapper — inline so it doesn't stretch block-level children.
		"&": "position:relative display:inline-block",
		// Tip panel — hidden until the wrapper is hovered or focus moves inside.
		".s-tt-tip": {
			"&":
				"position:absolute z-index:300 " +
				"max-width:20rem w:max-content " +
				"bg:$s-raised fg:$s-fg border: 1px solid $s-border-strong; " +
				"r:$s-radius box-shadow:$s-shadow " +
				"padding: 0.3em 0.65em; font-size:0.85em line-height:1.4 " +
				"opacity:0 pointer-events:none " +
				"transition: opacity 0.15s, transform 0.15s;",
		},
		// Show on hover or keyboard focus inside the wrapper.
		"&:hover .s-tt-tip, &:focus-within .s-tt-tip":
			"opacity:1 pointer-events:auto",
		// Placement: top (default) — appears above, centered.
		"&:not(.s-tt-bottom):not(.s-tt-left):not(.s-tt-right) .s-tt-tip":
			"bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%) translateY(4px);",
		"&:not(.s-tt-bottom):not(.s-tt-left):not(.s-tt-right):hover .s-tt-tip":
			"transform: translateX(-50%) translateY(0);",
		"&:not(.s-tt-bottom):not(.s-tt-left):not(.s-tt-right):focus-within .s-tt-tip":
			"transform: translateX(-50%) translateY(0);",
		// bottom
		"&.s-tt-bottom .s-tt-tip":
			"top: calc(100% + 6px); left: 50%; transform: translateX(-50%) translateY(-4px);",
		"&.s-tt-bottom:hover .s-tt-tip": "transform: translateX(-50%) translateY(0);",
		"&.s-tt-bottom:focus-within .s-tt-tip": "transform: translateX(-50%) translateY(0);",
		// left
		"&.s-tt-left .s-tt-tip":
			"right: calc(100% + 6px); top: 50%; transform: translateY(-50%) translateX(4px);",
		"&.s-tt-left:hover .s-tt-tip": "transform: translateY(-50%) translateX(0);",
		"&.s-tt-left:focus-within .s-tt-tip": "transform: translateY(-50%) translateX(0);",
		// right
		"&.s-tt-right .s-tt-tip":
			"left: calc(100% + 6px); top: 50%; transform: translateY(-50%) translateX(-4px);",
		"&.s-tt-right:hover .s-tt-tip": "transform: translateY(-50%) translateX(0);",
		"&.s-tt-right:focus-within .s-tt-tip": "transform: translateY(-50%) translateX(0);",
	},
});

/**
 * Wraps `content` in a tooltip trigger. The `tip` is shown on hover or when
 * keyboard focus enters the wrapper, and hidden on blur/mouse-leave.
 *
 * The tooltip is rendered in the DOM at all times (opacity 0 when hidden), so
 * `aria-describedby` points at it and screen readers can narrate it.
 *
 * **Note:** the wrapper is `display:inline-block`. If you need block layout,
 * pass `attrs: "display:block"`.
 *
 * **Overflow caveat:** the tooltip uses `position:absolute`. It will be clipped
 * if any ancestor has `overflow:hidden`. In that case, restructure the layout so
 * the wrapper is outside the clipped container.
 *
 * @example
 * ```ts
 * S.tooltip({
 *   tip: "Saves your work to the cloud",
 *   content: () => S.button({ text: "Save" }),
 * });
 *
 * S.tooltip({
 *   tip: "Dangerous — cannot be undone",
 *   placement: "bottom",
 *   content: () => S.button({ text: "Delete", attrs: ".danger" }),
 * });
 * ```
 */
export function tooltip(opts: TooltipOptions): void {
	const tipId = uniqueId("tip");
	const placementCls =
		opts.placement && opts.placement !== "top" ? `.s-tt-${opts.placement}` : "";

	A(`div.s-tt${placementCls} aria-describedby=${tipId}`, opts.attrs, () => {
		opts.content();
		A(`div.s-tt-tip role=tooltip id=${tipId}`, () => {
			drawSlot(opts.tip);
		});
	});
}

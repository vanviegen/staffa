import A from "aberdeen";
import { cssZoom, type Slot, type Attributes, drawSlot, mountPortal } from "../core.js";

/** Options for {@link addTooltip}. */
export interface TooltipOptions {
	/** The tooltip text or draw function. A string is rendered as rich text. */
	tip: Slot;
	/**
	 * Which side the tooltip appears on. Defaults to `"top"`.
	 * Automatically flips to the opposite side when there isn't enough room.
	 */
	placement?: "top" | "bottom" | "left" | "right";
	/** Aberdeen attr/style string applied to the tip panel. */
	attrs?: Attributes;
}

// The tip is a `.s-s.neutral.shadow` surface (it portals to <body>, so it renders at
// the page's next neutral shade), which provides its background, ink, border,
// radius and elevation.
A.insertGlobalCss({
	".s-tt-tip": {
		"&":
			"position:fixed z-index:500 " +
			"max-width:20rem w:max-content " +
			"padding: 0.3em 0.65em; font-size:0.85em line-height:1.4 " +
			"pointer-events:none",
	},
});

// ─── Global portal state ────────────────────────────────────────────────────

// At most one tooltip is visible at a time. The anchor is the element the
// handlers were attached to (its bounding rect drives positioning).
const $ttActive = A.proxy<{ opts: TooltipOptions; anchor: HTMLElement } | undefined>(undefined);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

// Hide tooltip when the page scrolls (anchor has moved).
if (typeof window !== "undefined") {
	window.addEventListener("scroll", () => { $ttActive.value = undefined; }, { capture: true, passive: true });
}

function computePos(rect: DOMRect, tipW: number, tipH: number, placement: string, zoom: number): { x: number; y: number } {
	// `rect` is handed over already in the tip's own coordinate space; the
	// window's size has to be brought into it too (see `cssZoom`).
	const gap = 7;
	const vw = window.innerWidth / zoom;
	const vh = window.innerHeight / zoom;
	let x = 0, y = 0;

	if (placement === "bottom") {
		x = rect.left + (rect.width - tipW) / 2;
		y = rect.bottom + gap;
		if (y + tipH > vh - 8) { y = rect.top - tipH - gap; }
	} else if (placement === "left") {
		x = rect.left - tipW - gap;
		y = rect.top + (rect.height - tipH) / 2;
		if (x < 8) { x = rect.right + gap; }
	} else if (placement === "right") {
		x = rect.right + gap;
		y = rect.top + (rect.height - tipH) / 2;
		if (x + tipW > vw - 8) { x = rect.left - tipW - gap; }
	} else {
		// top (default)
		x = rect.left + (rect.width - tipW) / 2;
		y = rect.top - tipH - gap;
		if (y < 8) { y = rect.bottom + gap; }
	}

	return {
		x: Math.max(8, Math.min(x, vw - tipW - 8)),
		y: Math.max(8, Math.min(y, vh - tipH - 8)),
	};
}

function scheduleHide(): void {
	if (hideTimer) clearTimeout(hideTimer);
	hideTimer = setTimeout(() => {
		$ttActive.value = undefined;
		hideTimer = null;
	}, 100);
}

// ─── Portal ──────────────────────────────────────────────────────────────────

mountPortal(() => {
	const active = $ttActive.value;
	if (!active) return;
	const { opts, anchor } = active;
	const placement = opts.placement ?? "top";

	const tipEl = A("div.s-tt-tip.s-s.neutral.shadow role=tooltip visibility:hidden", opts.attrs, () => {
		A("mouseenter=", () => {
			if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
		});
		A("mouseleave=", scheduleHide);
		drawSlot(opts.tip);
	}) as HTMLElement;

	requestAnimationFrame(() => {
		if (!document.body.contains(tipEl)) return;
		// The anchor's rect is in window coordinates; the left/top set below live
		// in the tip's own space — scale it over before computing (see `cssZoom`).
		const z = cssZoom(tipEl);
		const r = anchor.getBoundingClientRect();
		const rect = new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z);
		const { x, y } = computePos(rect, tipEl.offsetWidth, tipEl.offsetHeight, placement, z);
		tipEl.style.left = x + "px";
		tipEl.style.top = y + "px";
		tipEl.style.visibility = "";
	});
});

// ─── Public component ────────────────────────────────────────────────────────

/**
 * Attaches a tooltip to the current element: adds hover/focus handlers via
 * {@link A} so the tip appears when the element is hovered or keyboard-focused.
 * The tip panel is rendered into `document.body` via a portal, so it is never
 * clipped by `overflow:hidden` ancestors. Position is computed from the
 * element's bounding rect and automatically flips when near the viewport edge.
 *
 * @example
 * ```ts
 * S.button(() => {
 *   A("#Save");
 *   S.addTooltip({ tip: "Saves your work to the cloud" });
 * });
 * 
 * A(" ");
 *
 * S.button(() => {
 *   A(".danger #Delete");
 *   S.addTooltip({ tip: "Dangerous — cannot be undone", placement: "bottom" });
 * });
 * ```
 */
export function addTooltip(opts: TooltipOptions): void {
	const show = (e: Event) => {
		if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
		$ttActive.value = { opts, anchor: e.currentTarget as HTMLElement };
	};

	A("mouseenter=", show);
	A("mouseleave=", scheduleHide);
	A("focusin=", show);
	A("focusout=", scheduleHide);

	A.clean(() => {
		if ($ttActive.value?.opts === opts) $ttActive.value = undefined;
	});
}

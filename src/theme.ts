import A from "aberdeen";

/**
 * Theming and global base styles for Skye.
 *
 * Skye is themed entirely through CSS custom properties (via Aberdeen's
 * {@link A.cssVars}). Components reference these with `var(--sPrimary)` etc., so
 * changing a single variable restyles the whole app — at runtime, reactively.
 *
 * Unlike typical Aberdeen apps (which use component-local `insertCss`), Skye uses
 * **global** CSS (`insertGlobalCss`) with class names prefixed `S_`. This is a
 * deliberate trade-off: it lets application authors override any Skye style from
 * their own stylesheet without fighting scoped class names.
 */

/**
 * The set of CSS custom properties Skye understands. All are plain CSS color /
 * length strings. Override any subset via {@link setTheme}.
 */
export interface Theme {
	/** Page background — the darkest surface. */
	sBg: string;
	/** Default surface for cards, inputs, menus. */
	sSurface: string;
	/** Raised surface for headers, footers, chips, hover states. */
	sSurfaceHi: string;
	/** Primary foreground / text color. */
	sFg: string;
	/** Muted text (help text, subtitles). */
	sFgMuted: string;
	/** Faint text (placeholders, disabled). */
	sFgFaint: string;
	/** Default border color. */
	sBorder: string;
	/** Stronger border / neutral control color. */
	sBorderStrong: string;
	/** Brand / accent color. */
	sPrimary: string;
	/** Brand color, hover/brighter. */
	sPrimaryHover: string;
	/** Text drawn on top of {@link Theme.sPrimary}. */
	sPrimaryFg: string;
	/** Destructive / error color. */
	sDanger: string;
	/** Positive / success color. */
	sSuccess: string;
	/** Caution color. */
	sWarning: string;
	/** Focus-ring color (usually a translucent primary). */
	sFocus: string;
	/** Default corner radius. */
	sRadius: string;
	/** Larger corner radius (e.g. the {@link import("./components/main").main} sheet). */
	sRadiusLg: string;
	/** Elevation shadow for menus, dialogs, the framed content sheet. */
	sShadow: string;
}

/**
 * The default Skye theme: dark, modern, and intentionally a little vivid so it
 * stands out of the box. Override pieces of it with {@link setTheme}.
 */
export const defaultTheme: Theme = {
	sBg: "#0e1015",
	sSurface: "#181b22",
	sSurfaceHi: "#222632",
	sFg: "#e8eaf0",
	sFgMuted: "#a6acba",
	sFgFaint: "#6b7280",
	sBorder: "#2c313c",
	sBorderStrong: "#3c4352",
	sPrimary: "#8b7bff",
	sPrimaryHover: "#a99dff",
	sPrimaryFg: "#0c0a1a",
	sDanger: "#ff6b6b",
	sSuccess: "#46d39a",
	sWarning: "#fbbf24",
	sFocus: "rgba(139, 123, 255, 0.45)",
	sRadius: "10px",
	sRadiusLg: "16px",
	sShadow: "0 8px 30px rgba(0, 0, 0, 0.45)",
};

/**
 * Apply theme variables, merging the given partial over whatever is currently
 * set. Call with no arguments to (re)install the {@link defaultTheme}.
 *
 * Assigning to {@link A.cssVars} is reactive, so calling this at any time
 * instantly updates every mounted component.
 *
 * @example
 * ```ts
 * import { setTheme } from "skye";
 * setTheme({ sPrimary: "#28c4a0", sPrimaryFg: "#08110d" });
 * ```
 */
export function setTheme(theme: Partial<Theme> = {}): void {
	const merged = { ...defaultTheme, ...theme };
	for (const [key, value] of Object.entries(merged)) {
		A.cssVars[key] = value;
	}
}

let initialised = false;

/**
 * Initialise spacing variables, the {@link defaultTheme} and the global base
 * stylesheet (a light CSS reset + element defaults). Safe to call repeatedly;
 * it only runs once. It is invoked automatically when you import Skye.
 */
export function initTheme(): void {
	if (initialised) return;
	initialised = true;

	// Exponential spacing scale: $1 = 0.25rem, $2 = 0.5rem, $3 = 1rem, ...
	A.setSpacingCssVars();
	setTheme();

	// A deliberately light reset. It sets box-sizing and sensible colors/fonts,
	// but does NOT strip margins from headings/paragraphs/lists, so rendered
	// rich content (e.g. markdown-to-HTML) keeps reasonable default rhythm.
	A.insertGlobalCss({
		"*, *::before, *::after": "box-sizing:border-box",
		html: "text-size-adjust:100%",
		body: "m:0 bg:$sBg fg:$sFg line-height:1.5 font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing:antialiased",
		a: "fg:$sPrimary text-decoration:underline text-underline-offset:2px",
		"a:hover": "fg:$sPrimaryHover",
		"input, button, textarea, select": "font:inherit color:inherit",
		"code, kbd, samp, pre": "font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;",
		code: "bg:$sSurfaceHi padding: 0.12em 0.34em; r:4px font-size:0.9em",
		pre: "bg:$sSurface p:$3 r:$sRadius overflow:auto",
		"pre code": "bg:transparent p:0",
		"img, svg, video, canvas": "max-width:100% h:auto",
		hr: "border:0 border-top: 1px solid $sBorder; margin: $3 0;",
		"::placeholder": "fg:$sFgFaint opacity:1",
		":focus-visible": "outline: 2px solid $sFocus; outline-offset:2px",
	});
}

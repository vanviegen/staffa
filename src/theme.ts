import A from "aberdeen";

/**
 * Theming and global base styles for Staffa.
 *
 * Staffa is themed entirely through CSS custom properties (via Aberdeen's
 * {@link A.cssVars}). Components reference these with `var(--sPrimary)` etc., so
 * changing a single variable restyles the whole app — at runtime, reactively.
 *
 * Unlike typical Aberdeen apps (which use component-local `insertCss`), Staffa uses
 * **global** CSS (`insertGlobalCss`) with class names prefixed `s-`. This is a
 * deliberate trade-off: it lets application authors override any Staffa style from
 * their own stylesheet without fighting scoped class names.
 */

/**
 * The set of CSS custom properties Staffa understands. All are plain CSS color /
 * length strings. Override any subset by mutating {@link darkTheme} /
 * {@link lightTheme}.
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
 * The default dark Staffa theme: modern and intentionally a little vivid so it
 * stands out of the box.
 *
 * This is a live Aberdeen proxy — mutate it (e.g. `darkTheme.sPrimary = "..."`)
 * and, while dark mode is active, the change flows straight into the CSS
 * variables. Use this to retheme dark and {@link lightTheme} independently.
 */
export const darkTheme: Theme = A.proxy<Theme>({
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
});

/**
 * The light Staffa theme — the same lavender brand, retuned for a bright,
 * modern surface: white cards on a soft grey page, a deeper primary so it
 * reads well on light backgrounds, and a softer elevation shadow.
 *
 * Like {@link darkTheme}, a live proxy: mutate it to retheme light mode.
 */
export const lightTheme: Theme = A.proxy<Theme>({
	sBg: "#f3f4f8",
	sSurface: "#ffffff",
	sSurfaceHi: "#eceef4",
	sFg: "#1b1e27",
	sFgMuted: "#5b6273",
	sFgFaint: "#9aa1b2",
	sBorder: "#e2e5ee",
	sBorderStrong: "#c7ccda",
	sPrimary: "#6c5ce7",
	sPrimaryHover: "#5847d4",
	sPrimaryFg: "#ffffff",
	sDanger: "#e23b3b",
	sSuccess: "#1f9d6b",
	sWarning: "#d97706",
	sFocus: "rgba(108, 92, 231, 0.35)",
	sRadius: "10px",
	sRadiusLg: "16px",
	sShadow: "0 6px 24px rgba(20, 24, 40, 0.12)",
});

const STORAGE_KEY = "staffa:darkMode";

/**
 * The explicit dark-mode choice — `true` (force dark), `false` (force light) or
 * `undefined` (follow the OS via {@link A.darkMode}). A reactive proxy, seeded
 * from localStorage so the persisted preference applies on the first paint.
 */
const $override = A.proxy<{ value: boolean | undefined }>({ value: readStoredOverride() });

/** Read the persisted dark-mode override from localStorage (defensively). */
function readStoredOverride(): boolean | undefined {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v === "dark") return true;
		if (v === "light") return false;
	} catch {
		// localStorage may be unavailable (SSR, privacy mode) — ignore.
	}
	return undefined;
}

/**
 * Force dark mode (`true`), light mode (`false`), or follow the OS preference
 * (`undefined`). Takes effect immediately and is persisted to localStorage, so
 * the choice survives reloads.
 */
export function setDarkMode(value: boolean | undefined): void {
	$override.value = value;
	try {
		if (value === undefined) localStorage.removeItem(STORAGE_KEY);
		else localStorage.setItem(STORAGE_KEY, value ? "dark" : "light");
	} catch {
		// Persistence is best-effort; ignore storage failures.
	}
}

/**
 * Whether dark mode is currently active. Reactive — read it inside a scope to
 * re-run on changes.
 *
 * @param allowAuto - When `true`, returns `undefined` (rather than resolving to
 *   a boolean) if the user is following the OS preference, so a dark/light/auto
 *   control can tell the three states apart.
 */
export function getDarkMode(allowAuto = false): boolean | undefined {
	const v = $override.value;
	return v === undefined && !allowAuto ? A.darkMode() : v;
}

// Set up everything as this module loads. Spacing scale first ($1 = 0.25rem,
// $2 = 0.5rem, $3 = 1rem, ...), then reactively merge the active theme into the
// CSS variables. This scope runs synchronously now — before the first paint —
// so the correct colors are in place immediately (no flash), and A.merge
// subscribes to the theme it reads, so toggling the mode or mutating
// darkTheme / lightTheme re-applies automatically.
A.setSpacingCssVars();
A(() => {
	A.merge(A.cssVars as Partial<Theme>, getDarkMode() ? darkTheme : lightTheme);
});

// A deliberately light reset. It sets box-sizing and sensible colors/fonts, but
// does NOT strip margins from headings/paragraphs/lists, so rendered rich
// content (e.g. markdown-to-HTML) keeps reasonable default rhythm.
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

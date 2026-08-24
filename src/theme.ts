import A from "aberdeen";

/**
 * Theming and global base styles for Staffa.
 *
 * A Staffa app is a tree of **surfaces** (`.s-s`), in two families:
 *
 * - **Neutral** — `.neutral`, and the implicit page at `:root`. Its shade steps
 *   with nesting depth (capped). No `tonal`/`outlined` variants.
 * - **Accent** — `.primary`, `.danger`, `.success`, `.warning`, `.link` (a bare
 *   `.s-s` is primary): a bright fill with white ink, `.tonal`/`.outlined`
 *   variants supported. A surface nested *inside* one is forced back to filled,
 *   so it can't bleed into the vivid parent.
 *
 * Every surface (and `:root`) defines the inherited tokens widgets style against,
 * so they adapt to wherever they're nested: `--s-bg`, `--s-text` (also applied as
 * `color`), `--s-muted` (secondary text), `--s-accent` (the surface's "pop" — the
 * brand primary on neutral surfaces, the ink on accent ones) and `--s-faint`
 * (hairline). The brand/semantic colours — `--s-primary`, `--s-danger`,
 * `--s-success`, `--s-warning`, `--s-link` — are mode-independent and settable;
 * overriding them re-skins the app. A custom accent surface needs only `--s-bg`
 * (and, if needed, `--s-text`); gradient and tokens follow:
 *
 * ```ts
 * A.insertGlobalCss({ ".s-s.brand": "--s-bg:#ef6b00 --s-text:#fff" });
 * S.button({ content: "Buy", attrs: ".brand" });
 * ```
 */

/**
 * The subtle single-colour wash a surface is painted with, as a `background:`
 * declaration, at the given angle. A shared constant rather than a `--s-sheen`
 * custom property: `var()`s inside a custom property resolve where it is
 * *defined*, so every surface would get the page's wash instead of its own.
 */
const sheen = (angle: string) =>
	`background: linear-gradient(${angle}, color-mix(in oklab, $s-bg, white 9%), color-mix(in oklab, $s-bg, black 9%));`;

/** The surface sheen: the wash every surface (and the page) is painted with. */
export const SURFACE_SHEEN = sheen("170deg");

/**
 * The same wash, straight down — for panels.ts, where the routed columns and the
 * ground beside them have to look like one continuous surface. An angled gradient
 * takes its extent from the box's *width* as well as its height, so boxes of
 * different widths would paint different slices of it and meet at a visible step.
 */
export const PANEL_SHEEN = sheen("180deg");

const STORAGE_KEY = "staffa:darkMode";

/** The explicit dark-mode choice; `undefined` follows the OS via {@link A.darkMode}. */
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
 * (`undefined`). Takes effect immediately and is persisted to localStorage.
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
 * @param allowAuto - When `true`, returns `undefined` (rather than a boolean) if
 *   the user is following the OS preference, so a dark/light/auto control can
 *   tell the three states apart.
 */
export function getDarkMode(allowAuto = false): boolean | undefined {
	const v = $override.value;
	return v === undefined && !allowAuto ? A.darkMode() : v;
}

// The only mode-dependent thing: the neutral shades and their ink, written
// straight onto the surfaces (no intermediate palette vars). `:root` is the page
// (depth 0); each nested `.neutral` steps a shade up, capped at the second level.
A(() => {
	if (getDarkMode()) {
		A.insertGlobalCss({
			":root, .s-s.neutral": "--s-bg:#0e0f12 --s-text:#e9eaec",
			".s-s.neutral": "--s-bg:#191b1f --s-text:#e9eaec",
			".s-s.neutral .s-s.neutral": "--s-bg:#23262b",
		});
	} else {
		A.insertGlobalCss({
			":root, .s-s.neutral": "--s-bg:#eef0f3 --s-text:#1d1f24",
			".s-s.neutral, .s-s.neutral": "--s-bg:#ffffff --s-text:#1d1f24",
			".s-s.neutral .s-s.neutral": "--s-bg:#f6f7f9",
		});
	}
});

// Static structure — inserted once, mode-independent. Rule order matters: role
// fills come after the `:not(.neutral)` default, so a caller's `attrs` override
// wins at equal specificity.

A.setSpacingCssVars(1.1);

A.insertGlobalCss({
	// A lightweight reset: bare semantic HTML, with less ugly defaults.
	"*, *::before, *::after": "box-sizing:border-box",
	html: "text-size-adjust:100%",
	body: "m:0 p:$3 line-height:1.5 font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing:antialiased background-color:$s-bg text:$s-text",
	// The contextual link colour: `--s-link` on neutral surfaces, the ink on accent ones.
	a: "color: $s-link-fg; text-decoration:underline text-underline-offset:2px; transition: color 0.12s, filter 0.12s;",
	"a:hover": "filter: brightness(1.15)",
	"input, button, textarea, select, optgroup": "font:inherit color:inherit",
	// Bare text-like fields get a calm bordered box derived from the surface.
	// `:where()` keeps it at element specificity, so a component class always wins.
	"input:where(:not([type=checkbox],[type=radio],[type=range],[type=file],[type=color],[type=image],[type=submit],[type=button],[type=reset],[type=hidden])), textarea, select":
		"background:$s-bg border: 1px solid $s-faint; r:$s-radius-sm padding: 0.45em 0.65em; max-width:100%",
	// Checkboxes/radios: a touch larger, with a pointer cursor. (`accent-color` is
	// inherited from the surface, see the `:root, .s-s` rule.)
	"input:where([type=checkbox],[type=radio])": "width:1.15em height:1.15em cursor:pointer",
	// Range: a thin faint pill track with a round brand thumb — no native groove.
	"input[type=range]": "appearance:none background:transparent cursor:pointer vertical-align:middle",
	"input[type=range]::-webkit-slider-runnable-track": "height:4px r:99px background:$s-faint",
	"input[type=range]::-moz-range-track": "height:4px r:99px background:$s-faint",
	"input[type=range]::-moz-range-progress": "height:4px r:99px background:$s-accent",
	"input[type=range]::-webkit-slider-thumb": "appearance:none width:16px height:16px margin-top:-6px r:50% background:$s-accent",
	"input[type=range]::-moz-range-thumb": "width:16px height:16px border:0 r:50% background:$s-accent",
	"input[type=file]": "cursor:pointer",
	// Progress: same thin faint pill track + brand fill as the range slider.
	progress: "appearance:none border:0 height:6px r:99px background:$s-faint overflow:hidden vertical-align:middle",
	"progress::-webkit-progress-bar": "background:$s-faint r:99px",
	"progress::-webkit-progress-value": "background:$s-accent r:99px",
	"progress::-moz-progress-bar": "background:$s-accent r:99px",
	meter: "vertical-align:middle",
	// Fieldsets: a quiet group box instead of the browser's heavy inset border.
	fieldset: "border: 1px solid $s-faint; r:$s-radius-sm padding:$2 min-width:0",
	legend: "padding: 0 $1; font-weight:600",
	"code, kbd, samp, pre": "font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;",
	code: "background: color-mix(in oklab, $s-text, $s-bg 86%); padding: 0.12em 0.34em; r:4px font-size:0.9em",
	pre: "background: color-mix(in oklab, $s-text, $s-bg 92%); p:$3 r: $s-radius; overflow:auto",
	"pre code": "background:transparent p:0",
	"img, svg, video, canvas": "max-width:100% h:auto",
	hr: "border:0 border-top: 1px solid $s-faint;",
	"::placeholder": "color: $s-muted; opacity:1",
	":focus-visible": "outline: 2px solid $s-focus; outline-offset:2px",
	small: "color:$s-muted font-size:0.9em",
	// Respect users who prefer less motion: keep transitions essentially instant.
	"@media (prefers-reduced-motion: reduce)": {
		"*, *::before, *::after": "transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; scroll-behavior: auto !important;",
	},

	// Color theming
	":root":
		// Brand + semantic colours (settable). One brand colour drives everything.
		"--s-primary:#00a884 --s-danger:#dc5b41 --s-success:#00a884 --s-warning:#ef6b00 --s-link:#3f8cd8 " +
		// Shape/effect — single values, reused across components.
		"--s-radius-sm:6px --s-radius:12px --s-radius-lg:18px " +
		"--s-focus: color-mix(in srgb, $s-primary 38%, transparent); " +
		// Brand sweep for the headline mark, the active nav pill, the selected tab.
		"--s-gradient: linear-gradient(135deg, color-mix(in oklab, $s-primary, white 16%), color-mix(in oklab, $s-primary, black 14%));",

	// Neutral surfaces (and the page); their bg/ink come from the mode block above.
	":root, .s-s.neutral": "--s-accent:$s-primary --s-link-fg:$s-link",

	// Accent surfaces: bright fill, white ink. The bare `:not(.neutral)` holds the
	// shared defaults; each role below names its own fill.
	".s-s:not(.neutral)":
		"--s-bg:$s-primary " + // Default .s-s to .primary
		"border:0 " +
		"--s-text:#eee --s-accent:#fff --s-link-fg:#eef " +
		"--s-muted: color-mix(in srgb, #fff 70%, transparent); " +
		"--s-faint: color-mix(in srgb, #fff 30%, transparent);",
	".s-s.danger": "--s-bg:$s-danger",
	".s-s.success": "--s-bg:$s-success",
	".s-s.warning": "--s-bg:$s-warning",
	".s-s.link": "--s-bg:$s-link",
	".s-s.primary": "--s-bg:$s-primary",

	// Every surface (and the page) derives its muted ink + hairline from the
	// text/bg pair it resolved to above.
	":root, .s-s":
		"--s-muted: color-mix(in oklab, $s-text, $s-bg 42%); " +
		"--s-faint: color-mix(in oklab, $s-text, $s-bg 80%); " +
		"color:$s-text accent-color:$s-accent scrollbar-width:thin scrollbar-color: $s-faint transparent;",
	// Subtle single-colour gradient sheen, painted on every surface (and the page).
	".s-s, body": SURFACE_SHEEN,
	".s-s": "r:$s-radius",
	// A neutral surface owns a hairline border, so a card reads as a card without
	// any component help. `:where()` keeps it zero-specificity, so a bar that wants
	// only a divider overrides it with a single plain rule.
	":where(.s-s.neutral)": "border: 1px solid $s-faint;",
	".s-s::-webkit-scrollbar, .s-s ::-webkit-scrollbar": "width:10px height:10px",
	".s-s::-webkit-scrollbar-track, .s-s ::-webkit-scrollbar-track": "background:transparent",
	".s-s::-webkit-scrollbar-thumb, .s-s ::-webkit-scrollbar-thumb":
		"background:$s-faint border-radius:99px border: 2px solid transparent; background-clip:padding-box",

	// Elevation: `.shadow`/`.extra-shadow` give a neutral surface a drop shadow and
	// an accent one a self-coloured glow; tonal/outlined have nothing to lift. A
	// `.neutral` button stays flat, so segmented groups gain no stray shadows.
	// `.no-shadow` comes last and needs `!important` to beat the glow rules.
	".s-s.shadow.neutral:not(.s-btn)": "box-shadow: 0 4px 14px rgba(0,0,0,0.13);",
	".s-s.extra-shadow.neutral:not(.s-btn)": "box-shadow: 0 18px 50px rgba(0,0,0,0.28);",
	".s-s.shadow:not(.neutral):not(.tonal):not(.outlined)": "box-shadow: 0 4px 14px color-mix(in srgb, $s-bg 30%, transparent);",
	".s-s.extra-shadow:not(.neutral):not(.tonal):not(.outlined)": "box-shadow: 0 14px 40px color-mix(in srgb, $s-bg 40%, transparent);",
	".s-s.no-shadow": "box-shadow: none !important;",

	// Accent variants: the fill colour becomes the ink, over a soft self-tint
	// (`tonal`) or a transparent body with a colour edge (`outlined`).
	".s-s:not(.neutral).tonal, .s-s:not(.neutral).outlined":
		"--s-text:$s-bg --s-accent:$s-bg --s-link-fg:$s-bg --s-faint: color-mix(in srgb, $s-bg 30%, transparent); --s-muted: color-mix(in srgb, $s-bg 70%, transparent);",
	".s-s:not(.neutral).tonal":
		"background: color-mix(in srgb, $s-bg 15%, transparent); border: 1px solid $s-faint;",
	".s-s:not(.neutral).outlined":
		"background: transparent; border: 1px solid color-mix(in srgb, $s-bg 45%, transparent);",
	// A surface inside an accent surface is forced back to filled: a translucent
	// body would bleed into the vivid parent. 4 classes beats the variant rules.
	".s-s:not(.neutral) .s-s.tonal, .s-s:not(.neutral) .s-s.outlined":
		"--s-text:#fff --s-accent:#fff --s-link-fg:#fff " +
		SURFACE_SHEEN + " border-color: transparent;",
});

// ── Suppress transitions during the initial load ─────────────────────────────
// Colour transitions make a light↔dark switch smooth, but on a cold load they'd
// animate from the unstyled colours into the theme. Tag <html> until the first
// frame has painted, so the initial render snaps to the right colours.
A.insertGlobalCss({
	".s-preload, .s-preload *, .s-preload *::before, .s-preload *::after":
		"transition: none !important; animation: none !important;",
});
if (typeof document !== "undefined" && typeof requestAnimationFrame === "function") {
	const root = document.documentElement;
	root.classList.add("s-preload");
	requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("s-preload")));
}

// ── Disabled region ───────────────────────────────────────────────────────────
// aria-disabled="true" on any container dims it and blocks pointer events on it
// and all descendants. Keyboard access is unaffected — add `inert` for that.
A.insertGlobalCss({
	":disabled, [aria-disabled=true]": "opacity:0.45 filter:saturate(0.6) user-select:none",
	":disabled, [aria-disabled=true], :disabled *, [aria-disabled=true] *": "pointer-events:none cursor:not-allowed",
});

// ── Flow content: vertical rhythm & light typography ─────────────────────────
// Block defaults for *any* content, markdown-rendered or your own: no browser
// block margins, but a *top* margin unless the block is its parent's first child.
const BLOCK = "p, ul, ol, dl, blockquote, pre, table, figure, hr, h1, h2, h3, h4, h5, h6";

A.insertGlobalCss({
	[`${BLOCK}`]: {
		"&": "margin:0",
		"&:not(:first-child)": "margin-top:$3",
	},

	// Headings: bold, tight, balanced.
	"h1, h2, h3, h4, h5, h6": {
		"&": "line-height:1.15 font-weight:700 text-wrap:balance",
		"&:not(:first-child)": "margin-top:1.4em",
	},
	h1: "font-size:2em font-weight:800 letter-spacing:-0.022em",
	h2: "font-size:1.55em letter-spacing:-0.018em",
	h3: "font-size:1.3em letter-spacing:-0.011em",
	h4: "font-size:1.1em",
	h5: "font-size:0.95em letter-spacing:0.005em",
	h6: "font-size:0.8em fg:$s-muted text-transform:uppercase letter-spacing:0.07em",

	// Lists: markers, a sensible indent, gently spaced items, tight nesting.
	"ul, ol": {
		"&": "padding-left:1.5em",
		"> li:not(:first-child), li > &:not(:first-child)": "margin-top:$1",
	},

	// Blockquote, tables, definition lists, figure captions.
	blockquote: "border-left: 3px solid $s-faint; padding-left: $3; fg: $s-muted",
	table: "border-collapse:collapse",
	"th, td": "text-align:left padding: $1 $2; border-bottom: 1px solid $s-faint; vertical-align:top",
	th: "font-weight:600",
	"thead th": "border-bottom: 2px solid $s-faint;",
	dt: "font-weight:600",
	dd: "margin-left: 1.5em",
	figcaption: "fg:$s-muted font-size:0.9em margin-top:$1 text-align:center",
});

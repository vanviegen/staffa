import A from "aberdeen";

/**
 * Theming and global base styles for Staffa.
 *
 * # The surface model
 *
 * A Staffa app is a tree of **surfaces**. A surface is anything with its own
 * background and the text colour that goes on it — the page, a card, a raised
 * header, a coloured button. Mark an element as a surface with the `.s-s` class,
 * then add modifier classes to colour it. A surface carries two colours:
 *
 * - `--s-a` — its default **foreground** (ink)
 * - `--s-b` — its default **background** (fill)
 *
 * set by a **level** modifier — `.base` (the page), `.panel` (the default card),
 * `.raised` (elevated chrome) — or an **accent role** modifier — `.primary`,
 * `.secondary`, `.gradient` (the brand sweep), `.neutral`, `.danger`,
 * `.success`, `.warning`.
 *
 * A **variant** modifier — `.filled` (the default), `.tonal` or `.outlined` —
 * decides how `--s-a`/`--s-b` map onto the tokens widgets read
 * (`--s-fg`/`--s-bg`). A shared rule then derives muted/faint/border from that
 * pair and paints the element. Because the derivation reads `$s-fg`/`$s-bg`,
 * every surface gets its *own* legible secondary colours: drop a widget on any
 * surface and it adapts. (`:root` is an implicit filled surface, so the page
 * renders without extra classes.)
 *
 * Components build surfaces by combining classes, e.g.
 * `A("div.s-s.panel.outlined", opts.attrs)` — and because `opts.attrs` is the
 * caller's escape hatch, passing e.g. `.filled` or `.danger` overrides the
 * default look.
 *
 * | token            | meaning                                  |
 * | ---------------- | ---------------------------------------- |
 * | `--s-fg`         | default text                              |
 * | `--s-bg`         | background                                |
 * | `--s-fg-muted`   | secondary text (subtitles, help)          |
 * | `--s-fg-faint`   | placeholders, disabled                    |
 * | `--s-border` / `--s-border-strong` | borders                 |
 * | `--s-accent`     | brand "pop" colour (active indicators, etc.) |
 * | `--s-gradient`   | full primary→secondary brand sweep (mark, active nav) |
 * | `--s-gradient-surface` | compressed sweep for filled gradient surfaces (buttons) |
 * | `--s-tint`       | brand mid colour; the hue the neutral greys lean toward |
 * | `--s-glow`       | soft coloured shadow for lit brand elements |
 * | `--s-link` / `--s-focus` | link & focus-ring colours         |
 * | `--s-radius` / `--s-radius-lg` / `--s-shadow` | shape tokens      |
 *
 * `--s-accent` and `--s-link` default to the brand / link colour, but on a
 * bright coloured surface (`.primary`, `.danger`, …) they fall back to that
 * surface's own ink so they stay legible.
 *
 * # The palette
 *
 * All colours come from a small set of named **palette** tokens on `:root`, set
 * per mode — the only place colours live, and the single place to re-skin:
 * `--s-primary`, `--s-secondary` (the two ends of `--s-gradient`), `--s-danger`,
 * `--s-success`, `--s-warning` (accent fills, which
 * double as semantic *ink* on neutral surfaces), `--s-neutral`, `--s-page`,
 * `--s-panel`, `--s-raised` (neutral fills), `--s-ink` (text on neutral) and
 * `--s-on-accent` (text on accent fills), plus `--s-link`/`--s-focus` and the
 * shape tokens. Every surface rule is wired to these, so they adapt with the
 * mode and with any override.
 *
 * # Variants
 *
 * Because the variant decides how `--s-a`/`--s-b` become `--s-fg`/`--s-bg`, the
 * three looks are generic and work on *any* role: `.tonal` reads the fill colour
 * as ink over a soft self-tint; `.outlined` reads it as ink over a transparent
 * fill with a coloured edge (inheriting the parent's background, so its derived
 * tokens read the real surroundings). Inside any of them `--s-fg`/`--s-bg` still
 * describe the real, rendered colours.
 *
 * # Customising
 *
 * There's no JS theme object — the colours live in the palette `insertGlobalCss`
 * call below, branched on {@link getDarkMode}. Re-skin from your app by
 * overriding palette tokens (per mode if you like), or give a surface an
 * image/gradient background (set `--s-b` to the dominant fallback colour so
 * derived tokens stay sensible). Staffa uses global, `s-`-prefixed classes, so
 * nothing is scoped away from you.
 *
 * ```ts
 * A(() => A.insertGlobalCss({ ":root": getDarkMode() ? "--s-primary:#28c4a0" : "--s-primary:#1f9d6b" }));
 * A.insertGlobalCss({ ".s-s.panel": "background: url(paper.png); --s-b: #efe9dd" });
 * ```
 */


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

// ---------------------------------------------------------------------------
// Reactive palette — the ONE place colours live, and the only thing that
// differs between light and dark. Everything else is wired to these named
// tokens, so an app can re-skin by overriding just a few of them. The accent
// names (--s-primary/-danger/-success/-warning) double as semantic *ink*
// colours, legible as text/borders on neutral surfaces.
// ---------------------------------------------------------------------------
// The neutral fills/inks aren't hard-coded greys: each one mixes a small dose
// of `--s-tint` (the brand's mid colour, defined in the static block below)
// into a true-grey base. Re-skin the brand and every "grey" — page, panels,
// ink, the neutral fill — drifts subtly toward the new brand hue, light and
// dark alike. The percentages are deliberately small: a tint you'd only spot
// in a side-by-side, never a colour cast.
A(() => {
	if (getDarkMode()) {
		A.insertGlobalCss({
			":root":
				"--s-primary:#8b7bff --s-secondary:#ef7fd0 --s-danger:#ff6b6b --s-success:#46d39a --s-warning:#fbbf24 " +
				"--s-neutral: color-mix(in oklab, #3d4047, $s-tint 14%); " +
				"--s-page: color-mix(in oklab, #0e0f12, $s-tint 5%); " +
				"--s-panel: color-mix(in oklab, #17181c, $s-tint 6%); " +
				"--s-raised: color-mix(in oklab, #212327, $s-tint 8%); " +
				"--s-ink: color-mix(in oklab, #e9eaec, $s-tint 8%); " +
				"--s-on-accent:#0c0a14 --s-focus: color-mix(in srgb, $s-primary 45%, transparent); " +
				"--s-radius:12px --s-radius-lg:18px --s-shadow: 0 10px 34px rgba(0,0,0,0.5);",
			// Contextual link, restored across the neutral group (see static block).
			":root, .s-s.base, .s-s.panel, .s-s.raised, .s-s.neutral": "--s-link:#6db3ff",
		});
	} else {
		A.insertGlobalCss({
			":root":
				"--s-primary:#6c5ce7 --s-secondary:#d6459e --s-danger:#e23b3b --s-success:#1f9d6b --s-warning:#d97706 " +
				"--s-neutral: color-mix(in oklab, #c9cbd0, $s-tint 14%); " +
				"--s-page: color-mix(in oklab, #f3f4f6, $s-tint 5%); " +
				"--s-panel: color-mix(in oklab, #ffffff, $s-tint 2%); " +
				"--s-raised: color-mix(in oklab, #edeef0, $s-tint 7%); " +
				"--s-ink: color-mix(in oklab, #1d1f24, $s-tint 7%); " +
				"--s-on-accent:#0c0a14 --s-focus: color-mix(in srgb, $s-primary 35%, transparent); " +
				"--s-radius:12px --s-radius-lg:18px --s-shadow: 0 10px 30px rgba(20,24,40,0.13);",
			":root, .s-s.base, .s-s.panel, .s-s.raised, .s-s.neutral": "--s-link:#2563eb",
		});
	}
});

// ---------------------------------------------------------------------------
// Static structure — inserted once, all wired to the palette above.
//
// A surface is marked with `.s-s`. Its level/role modifier sets two anchors
// (--s-a ink, --s-b fill); its variant modifier (`.filled` default, `.tonal`,
// `.outlined`) decides how those anchors map onto the rendered fg/bg. `:root`
// (the page) is an implicit filled surface. Every `.s-s` then runs the same
// derive+paint step, reading the resolved fg/bg, so each one gets its own
// legible secondary tokens regardless of variant.
//
// Rule order matters: the variant/role rules below all share specificity, so a
// later one wins. `.filled` therefore comes *last* among the variants — that's
// what lets a caller's `attrs: ".filled"` override a component's default
// `.tonal`/`.outlined`.
// ---------------------------------------------------------------------------

A.setSpacingCssVars();

A.insertGlobalCss({
	// Derived brand tokens. These only reference the per-mode palette colours, so
	// they're defined once here and track the active mode (and any re-skin):
	// `--s-tint` is the brand's mid colour, the hue the neutral greys above lean
	// toward; `--s-gradient` is the full primary→secondary sweep used where the
	// brand should *show* (the headline mark, the active nav pill, tab edges);
	// `--s-gradient-surface` is a compressed, near-vertical cut of that same sweep
	// for *filled* gradient surfaces (buttons): it reads as one rich colour with
	// depth rather than a two-colour banner; `--s-glow` is a soft coloured shadow
	// that makes lit brand elements feel raised; `--s-page-bg` is a faint
	// twin-corner aurora wash painted on the page surface.
	":root":
		"--s-tint: color-mix(in oklab, $s-primary, $s-secondary); " +
		"--s-gradient: linear-gradient(135deg, $s-primary, $s-secondary); " +
		"--s-gradient-surface: linear-gradient(170deg, color-mix(in oklab, $s-primary 85%, $s-secondary), color-mix(in oklab, $s-primary 30%, $s-secondary)); " +
		"--s-glow: 0 5px 16px color-mix(in srgb, $s-primary 26%, transparent); " +
		"--s-page-bg: radial-gradient(120% 80% at 100% 0%, color-mix(in oklab, $s-secondary, transparent 86%), transparent 56%), radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, $s-primary, transparent 87%), transparent 56%), $s-page;",

	// Level/role modifier → anchors. Levels (neutral elevations) use the shared
	// ink; accent roles use the on-accent ink over their named fill. The page
	// (`.base`) additionally paints the aurora wash; `--s-b` keeps the solid
	// fallback so every derived token stays sensible.
	":root, .s-s.base": "--s-a:$s-ink --s-b:$s-page",
	".s-s.base": "background: $s-page-bg;",
	".s-s.panel":   "--s-a:$s-ink --s-b:$s-panel",
	".s-s.raised":  "--s-a:$s-ink --s-b:$s-raised",
	".s-s.neutral": "--s-a:$s-ink --s-b:$s-neutral",
	".s-s.primary":   "--s-a:$s-on-accent --s-b:$s-primary",
	".s-s.secondary": "--s-a:$s-on-accent --s-b:$s-secondary",
	".s-s.danger":    "--s-a:$s-on-accent --s-b:$s-danger",
	".s-s.success":   "--s-a:$s-on-accent --s-b:$s-success",
	".s-s.warning":   "--s-a:$s-on-accent --s-b:$s-warning",
	// `.gradient` is an accent role whose fill is the brand sweep. Its `--s-b`
	// anchor stays the solid `--s-primary` so the derived tokens (muted ink,
	// border, …) remain sensible; the gradient itself is painted further down,
	// only in the filled context (tonal/outlined read the solid fallback instead).
	".s-s.gradient":  "--s-a:$s-on-accent --s-b:$s-primary",

	// Filled default (bare `.s-s` and `:root`): map the anchors to fg/bg, derive
	// the secondary tokens from that pair, then paint. var() resolves at use time,
	// so the tonal/outlined remaps below feed back into the derived tokens.
	":root, .s-s":
		"--s-fg:$s-a --s-bg:$s-b " +
		"--s-fg-muted: color-mix(in oklab, $s-fg, $s-bg 42%); " +
		"--s-fg-faint: color-mix(in oklab, $s-fg, $s-bg 64%); " +
		"--s-border: color-mix(in oklab, $s-fg, $s-bg 82%); " +
		"--s-border-strong: color-mix(in oklab, $s-fg, $s-bg 68%); " +
		// Themed scrollbars (standard properties, honoured by Firefox and modern
		// Chromium): the thumb uses the surface's derived border token, so the bar
		// tracks the active mode/re-skin and a nested surface's own colours.
		"scrollbar-width:thin scrollbar-color: $s-border-strong transparent; " +
		"background:$s-bg color:$s-fg r:$s-radius",
	// WebKit/older-Chromium counterpart to the standard `scrollbar-*` props above:
	// a transparent track and a rounded thumb (border-clipped to leave breathing
	// room) that brightens on hover.
	".s-s::-webkit-scrollbar, .s-s ::-webkit-scrollbar": "width:10px height:10px",
	".s-s::-webkit-scrollbar-track, .s-s ::-webkit-scrollbar-track": "background:transparent",
	".s-s::-webkit-scrollbar-thumb, .s-s ::-webkit-scrollbar-thumb": "background:$s-border-strong border-radius:99px border: 2px solid transparent; background-clip:padding-box",
	".s-s::-webkit-scrollbar-thumb:hover, .s-s ::-webkit-scrollbar-thumb:hover": "background:$s-fg-faint background-clip:padding-box",
	// Tonal: the fill colour becomes the ink, over a soft tint of itself.
	".s-s.tonal": "--s-fg:$s-b --s-bg: color-mix(in srgb, $s-b 16%, transparent); border: 1px solid $s-border;",
	// Outlined: the fill colour is the ink; --s-bg *inherits* the parent's bg (the
	// token the derivations read, so the edge mixes ink with the real surroundings)
	// while the painted background is transparent, letting that parent fill — even
	// a gradient or image — show through.
	".s-s.outlined": "--s-fg:$s-b --s-bg:inherit background:transparent --s-border: color-mix(in srgb, $s-fg 55%, $s-bg); border: 1px solid $s-border;",
	// Filled, explicit — last among the variants so a caller's `attrs: ".filled"`
	// overrides a component's default `.tonal`/`.outlined` (resetting both the
	// anchors and the painted background).
	".s-s.filled": "--s-fg:$s-a --s-bg:$s-b background:$s-bg;",
	// Paint the brand sweep for a filled `.gradient` surface — the compressed
	// surface cut, not the full banner sweep. Sits after the variant rules and is
	// keyed on `:not(.tonal):not(.outlined)`, so those variants keep their
	// solid-primary tint/edge.
	".s-s.gradient:not(.tonal):not(.outlined)": "background: $s-gradient-surface;",

	// Contextual accent: the brand pop colour on neutral surfaces. Declared on the
	// whole neutral group so re-entering a neutral surface under a coloured one
	// restores it. (--s-link gets the same treatment in the reactive block, where
	// its per-mode literal lives — it can't reference the palette, as the palette
	// source and the contextual token share the name --s-link.)
	":root, .s-s.base, .s-s.panel, .s-s.raised, .s-s.neutral": "--s-accent:$s-primary",
	// On a bright coloured surface those wouldn't be legible, so they fall back to
	// the surface's own ink. (Keyed on the role modifier, so it holds across
	// variants — and tracks the tonal/outlined fg remap.)
	".s-s.primary, .s-s.secondary, .s-s.danger, .s-s.success, .s-s.warning, .s-s.gradient": "--s-accent:$s-fg --s-link:$s-fg",
	// Tonal/outlined nested inside a filled accent surface would lose legibility:
	// their transparency bleeds into the vivid parent fill. Swap in the neutral
	// panel as a base so the role color reads as ink rather than fill.
	// Specificity (4 classes) beats the 2-class variant rules — no !important needed.
	".s-s.primary .s-s.tonal, .s-s.secondary .s-s.tonal, .s-s.gradient .s-s.tonal, .s-s.danger .s-s.tonal, .s-s.success .s-s.tonal, .s-s.warning .s-s.tonal, .s-s.primary .s-s.outlined, .s-s.secondary .s-s.outlined, .s-s.gradient .s-s.outlined, .s-s.danger .s-s.outlined, .s-s.success .s-s.outlined, .s-s.warning .s-s.outlined":
		"--s-bg: $s-panel; background: $s-panel;",
});

// A deliberately light reset. Colours/shape come from the contextual tokens, so
// rich content (e.g. markdown-to-HTML) adapts to whatever surface holds it. The
// vertical rhythm / typography of block elements is handled separately, below.
A.insertGlobalCss({
	"*, *::before, *::after": "box-sizing:border-box",
	html: "text-size-adjust:100%",
	body: "m:0 line-height:1.5 font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing:antialiased",
	a: "color: $s-link; text-decoration:underline text-underline-offset:2px; transition: color 0.12s, filter 0.12s;",
	"a:hover": "filter: brightness(1.15)",
	"input, button, textarea, select": "font:inherit color:inherit",
	"code, kbd, samp, pre": "font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;",
	code: "background: color-mix(in oklab, $s-fg, $s-bg 86%); padding: 0.12em 0.34em; r:4px font-size:0.9em",
	pre: "background: color-mix(in oklab, $s-fg, $s-bg 92%); p:$3 r: $s-radius; overflow:auto",
	"pre code": "background:transparent p:0",
	"img, svg, video, canvas": "max-width:100% h:auto",
	hr: "border:0 border-top: 1px solid $s-border;",
	"::placeholder": "color: $s-fg-faint; opacity:1",
	":focus-visible": "outline: 2px solid $s-focus; outline-offset:2px",
	small: "color:$s-fg-muted font-size:0.9em",
	// Respect users who prefer less motion: keep transitions essentially instant.
	"@media (prefers-reduced-motion: reduce)": {
		"*, *::before, *::after": "transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; scroll-behavior: auto !important;",
	},
});

// ── Suppress transitions during the initial load ─────────────────────────────
// Buttons (and links) transition their colours, so a light↔dark switch animates
// smoothly. On a *cold* load that's a liability: elements mount and paint in the
// active theme in one pass, but a transitioning element animates from its
// default (unstyled) colours into the theme — so a fresh button visibly slides
// from light to dark while the rest of the page is already correct. Tag <html>
// until the first frame has painted and hard-disable transitions under that tag,
// so the initial render snaps straight to the right colours. Two rAFs: the first
// runs before the paint that shows the themed UI, the second clears the tag just
// after it — later theme switches then animate as normal.
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
// aria-disabled="true" on any container dims it and blocks pointer events on
// it and all descendants, matching the per-element disabled look. Keyboard
// access to focusable descendants is unaffected — add the `inert` attribute too
// if you need that.
A.insertGlobalCss({
	":disabled, [aria-disabled=true]": "opacity:0.45 filter:saturate(0.6) user-select:none",
	":disabled, [aria-disabled=true], :disabled *, [aria-disabled=true] *": "pointer-events:none cursor:not-allowed",
});

// ── Flow content: vertical rhythm & light typography ─────────────────────────
// Sensible block defaults for *any* content — your own UI just as much as
// markdown-rendered HTML. The rhythm: strip the browser's block margins, then
// give every block a *top* margin only when it isn't its parent's first child.
// Content sits flush against its container's edges, and space appears solely
// *between* siblings. These are intentionally low-specificity defaults — a
// component or utility that sets its own margin (or an inline `mt:` shortcut)
// always wins, so a class only ever changes what it actually names.
const BLOCK = "p, ul, ol, dl, blockquote, pre, table, figure, hr, h1, h2, h3, h4, h5, h6";

A.insertGlobalCss({
	[`${BLOCK}`]: {
		"&": "margin:0",
		"&:not(:first-child)": "margin-top:$3",
	},

	// Headings: bold, tight, balanced. Big levels get slightly negative tracking,
	// small levels become spaced "labels" — so adjacent levels stay distinct. The
	// em-based top margin gives larger headings a little more room above.
	"h1, h2, h3, h4, h5, h6": {
		"&": "line-height:1.15 font-weight:700 text-wrap:balance",
		"&:not(:first-child)": "margin-top:1.4em",
	},
	h1: "font-size:2em font-weight:800 letter-spacing:-0.022em",
	h2: "font-size:1.55em letter-spacing:-0.018em",
	h3: "font-size:1.3em letter-spacing:-0.011em",
	h4: "font-size:1.1em",
	h5: "font-size:0.95em letter-spacing:0.005em",
	h6: "font-size:0.8em fg:$s-fg-muted text-transform:uppercase letter-spacing:0.07em",

	// Lists: markers, a sensible indent, gently spaced items, tight nesting.
	"ul, ol": {
		"&": "padding-left:1.5em",
		"> li:not(:first-child), li > &:not(:first-child)": "margin-top:$1",
	},

	// Blockquote, tables, definition lists, figure captions.
	blockquote: "border-left: 3px solid $s-border; padding-left: $3; fg: $s-fg-muted",
	table: "border-collapse:collapse",
	"th, td": "text-align:left padding: $1 $2; border-bottom: 1px solid $s-border; vertical-align:top",
	th: "font-weight:600",
	"thead th": "border-bottom: 2px solid $s-border-strong;",
	dt: "font-weight:600",
	dd: "margin-left: 1.5em",
	figcaption: "fg:$s-fg-muted font-size:0.9em margin-top:$1 text-align:center",
});

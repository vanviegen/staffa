import A from "aberdeen";

/**
 * The named accent roles for interactive elements (buttons, tabs, badges, …).
 * Each maps to a `.s-<role>` class that sets `--s-a` (ink) and `--s-b` (fill).
 */
export type SurfaceRole = "primary" | "neutral" | "danger" | "success" | "warning";

/** How a role's two colours are rendered. `filled` is the default. */
export type Variant = "filled" | "tonal" | "outlined";

/**
 * A combined look string: a role alone (defaults to filled), or role + variant
 * joined by `-`. All combinations are statically typed via template literals.
 *
 * @example "primary" | "danger-tonal" | "neutral-outlined"
 */
export type Look = SurfaceRole | `${SurfaceRole}-${Variant}`;

/**
 * Convert a {@link Look} string to its role + variant CSS class selectors for
 * Aberdeen, e.g. `"danger-tonal"` → `.s-danger.s-tonal`. A bare role defaults to
 * the filled variant.
 */
export function lookClasses(look: Look = "primary"): string {
	const [role, variant = "filled"] = look.split("-");
	return `.s-${role}.s-${variant}`;
}

/**
 * Theming and global base styles for Staffa.
 *
 * # The surface model
 *
 * A Staffa app is a tree of **surfaces**. A surface is anything with its own
 * background and the text colour that goes on it — the page, a card, a raised
 * header, a coloured button. A surface carries two colours:
 *
 * - `--s-a` — its default **foreground** (ink)
 * - `--s-b` — its default **background** (fill)
 *
 * set by a **level** class — `.s-base` (the page), `.s-panel` (the default
 * card), `.s-raised` (elevated chrome) — or an **accent role** class —
 * `.s-primary`, `.s-neutral`, `.s-danger`, `.s-success`, `.s-warning`.
 *
 * A colour class alone doesn't render: it needs a **variant** class too —
 * `.s-filled` (the default), `.s-tonal` or `.s-outlined` — which decides how
 * `--s-a`/`--s-b` map onto the tokens widgets read (`--s-fg`/`--s-bg`). A shared
 * rule then derives muted/faint/border from that pair and paints the element.
 * Because the derivation reads `$s-fg`/`$s-bg`, every surface gets its *own*
 * legible secondary colours: drop a widget on any surface and it adapts.
 * (`:root` is implicitly filled, so the page renders without extra classes.)
 *
 * | token            | meaning                                  |
 * | ---------------- | ---------------------------------------- |
 * | `--s-fg`         | default text                              |
 * | `--s-bg`         | background                                |
 * | `--s-fg-muted`   | secondary text (subtitles, help)          |
 * | `--s-fg-faint`   | placeholders, disabled                    |
 * | `--s-border` / `--s-border-strong` | borders                 |
 * | `--s-accent`     | brand "pop" colour (active indicators, etc.) |
 * | `--s-link` / `--s-focus` | link & focus-ring colours         |
 * | `--s-radius` / `--s-radius-lg` / `--s-shadow` | shape tokens      |
 *
 * `--s-accent` and `--s-link` default to the brand / link colour, but on a
 * bright coloured surface (`.s-primary`, `.s-danger`, …) they fall back to that
 * surface's own ink so they stay legible.
 *
 * # Variants
 *
 * Because the variant decides how `--s-a`/`--s-b` become `--s-fg`/`--s-bg`, the
 * three looks are generic and work on *any* role: `.s-tonal` reads the fill
 * colour as ink over a soft self-tint; `.s-outlined` reads it as ink over a
 * transparent fill with a coloured edge (inheriting the parent's background, so
 * its derived tokens read the real surroundings). Inside any of them
 * `--s-fg`/`--s-bg` still describe the real, rendered colours.
 *
 * # Customising
 *
 * There's no JS theme object — the colours live in the `insertGlobalCss` calls
 * below, branched on {@link getDarkMode}. Override anything from your app the
 * same way: re-declare a surface's `--s-a`/`--s-b`, or give it an image/gradient
 * background (set `--s-b` to the dominant fallback colour so derived tokens stay
 * sensible). Staffa uses global, `s-`-prefixed classes, so nothing is scoped
 * away from you.
 *
 * ```ts
 * A(() => A.insertGlobalCss({ ".s-primary": getDarkMode() ? "--s-b:#28c4a0" : "--s-b:#1f9d6b" }));
 * A.insertGlobalCss({ ".s-panel": "background: url(paper.png); --s-b: #efe9dd" });
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
// Static rules — inserted once.
//
// A surface carries two anchors (--s-a ink, --s-b fill) via its level/role
// class, but only renders once it also has a *variant* class — `.s-filled`,
// `.s-tonal` or `.s-outlined` — which decides how those anchors map onto the
// rendered fg/bg. `:root` (the page) is implicitly filled. Every painted
// surface then runs the same derive+paint step, reading the resolved fg/bg, so
// each one gets its own legible secondary tokens regardless of variant.
// ---------------------------------------------------------------------------

A.setSpacingCssVars();

A.insertGlobalCss({
	// Variant → fg/bg mapping. `:root` (the page) is implicitly filled.
	":root, .s-filled": "--s-fg: $s-a; --s-bg: $s-b;",
	// Tonal: the fill colour becomes the ink, over a soft tint of itself.
	".s-tonal": "--s-fg: $s-b; --s-bg: color-mix(in srgb, $s-b 16%, transparent);",

	// Shared across every rendered variant: derive secondary tokens from the
	// resolved pair, then paint. var() substitution uses the final fg/bg.
	":root, .s-filled, .s-tonal, .s-outlined":
		"--s-fg-muted: color-mix(in oklab, $s-fg, $s-bg 42%); " +
		"--s-fg-faint: color-mix(in oklab, $s-fg, $s-bg 64%); " +
		"--s-border: color-mix(in oklab, $s-fg, $s-bg 82%); " +
		"--s-border-strong: color-mix(in oklab, $s-fg, $s-bg 68%); " +
		"background: $s-bg; color: $s-fg;",

	// Outlined: the fill colour is the ink; --s-bg is left to *inherit* (the token
	// the derivations above read, so the edge mixes ink with the real parent bg).
	// The painted background is forced transparent — NOT var(--s-bg) — so the
	// parent's actual fill, including a gradient or image, shows through. After
	// the shared rule so background/border win.
	".s-outlined": "--s-fg: $s-b; background: transparent; --s-border: color-mix(in srgb, $s-fg 55%, $s-bg);",

	// On a bright coloured surface the brand accent/link wouldn't be legible, so
	// they fall back to the surface's own ink. (Keyed on the role class, so it
	// holds across variants — and tracks the tonal/outlined fg remap.)
	".s-primary, .s-danger, .s-success, .s-warning": "--s-accent: $s-fg; --s-link: $s-fg;",
});

// ---------------------------------------------------------------------------
// Reactive palette — the only thing that differs between light and dark. Reading
// getDarkMode() subscribes us, so toggling re-applies; insertGlobalCss cleans
// up its previous rules on re-run.
// ---------------------------------------------------------------------------
A(() => {
	if (getDarkMode()) {
		A.insertGlobalCss({
			":root, .s-base": "--s-a: #e8eaf0; --s-b: #0e1015; --s-focus: rgba(139,123,255,0.45); --s-radius: 10px; --s-radius-lg: 16px; --s-shadow: 0 8px 30px rgba(0,0,0,0.45);",
			// Accent (the brand pop colour) and link, for surfaces without a bright
			// fill. Declared on the whole neutral group so re-entering a neutral
			// surface under a coloured one restores them.
			":root, .s-base, .s-panel, .s-raised, .s-neutral": "--s-accent: #8b7bff; --s-link: #6db3ff;",
			".s-panel":       "--s-a: #e8eaf0; --s-b: #181b22;",
			".s-raised":      "--s-a: #e8eaf0; --s-b: #222632;",
			".s-neutral":     "--s-a: #e8eaf0; --s-b: #3c4352;",
			".s-primary":     "--s-a: #0c0a1a; --s-b: #8b7bff;",
			".s-danger":      "--s-a: #1a0808; --s-b: #ff6b6b;",
			".s-success":     "--s-a: #08110d; --s-b: #46d39a;",
			".s-warning":     "--s-a: #1c1402; --s-b: #fbbf24;",
		});
	} else {
		A.insertGlobalCss({
			":root, .s-base": "--s-a: #1b1e27; --s-b: #f3f4f8; --s-focus: rgba(108,92,231,0.35); --s-radius: 10px; --s-radius-lg: 16px; --s-shadow: 0 6px 24px rgba(20,24,40,0.12);",
			":root, .s-base, .s-panel, .s-raised, .s-neutral": "--s-accent: #6c5ce7; --s-link: #2563eb;",
			".s-panel":       "--s-a: #1b1e27; --s-b: #ffffff;",
			".s-raised":      "--s-a: #1b1e27; --s-b: #eceef4;",
			".s-neutral":     "--s-a: #1b1e27; --s-b: #c7ccda;",
			".s-primary":     "--s-a: #ffffff; --s-b: #6c5ce7;",
			".s-danger":      "--s-a: #ffffff; --s-b: #e23b3b;",
			".s-success":     "--s-a: #ffffff; --s-b: #1f9d6b;",
			".s-warning":     "--s-a: #ffffff; --s-b: #d97706;",
		});
	}
});

// A deliberately light reset. Colours/shape come from the contextual tokens, so
// rich content (e.g. markdown-to-HTML) adapts to whatever surface holds it. It
// does NOT strip margins from headings/paragraphs/lists.
A.insertGlobalCss({
	"*, *::before, *::after": "box-sizing:border-box",
	html: "text-size-adjust:100%",
	body: "m:0 line-height:1.5 font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing:antialiased",
	a: "color: $s-link; text-decoration:underline text-underline-offset:2px",
	"a:hover": "filter: brightness(1.15)",
	"input, button, textarea, select": "font:inherit color:inherit",
	"code, kbd, samp, pre": "font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;",
	code: "background: color-mix(in oklab, $s-fg, $s-bg 86%); padding: 0.12em 0.34em; r:4px font-size:0.9em",
	pre: "background: color-mix(in oklab, $s-fg, $s-bg 92%); p:$3 r: $s-radius; overflow:auto",
	"pre code": "background:transparent p:0",
	"img, svg, video, canvas": "max-width:100% h:auto",
	hr: "border:0 border-top: 1px solid $s-border; margin: $3 0;",
	"::placeholder": "color: $s-fg-faint; opacity:1",
	":focus-visible": "outline: 2px solid $s-focus; outline-offset:2px",
	small: "color:$s-fg-muted font-size:0.9em",
});

import A, { OPAQUE } from "aberdeen";
import * as route from "aberdeen/route";
import { type Slot, drawSlot } from "../core.js";
import {
	circle as dotIcon, externalLink as newTabIcon, link as linkIcon,
	pin as pinIcon, pinOff as pinOffIcon, slash as sepIcon, x as closeIcon,
} from "../icons.js";
import { SURFACE_SHEEN } from "../theme.js";
import { addContextMenu } from "./menu.js";
import { scrollStrip, revealInStrip } from "./tabs.js";
import { toast } from "./toast.js";

/**
 * Routed, multi-column panel navigation for {@link main}.
 *
 * Each route draws one screen of the app, called a *panel*. The open panels
 * form a **stack**, and one of them is the **current** panel: the one the URL
 * names, and the rightmost column on screen. As many panels as fit are shown,
 * ending at the current one — on a phone that is one at a time, on a wider
 * screen the panels that would have covered each other sit side by side
 * instead. The app's own code is the same either way.
 *
 * Going to a panel that is already open — a breadcrumb, or any link to it —
 * just moves the current-panel cursor along the stack: panels right of it stay
 * open, parked past the right edge of the viewport, and nothing closes.
 * Opening a *new* panel is what prunes: everything after the panel it came
 * from closes, except panels the user pinned — which ride along beneath the
 * new panel — and panels holding unsaved work, which no navigation ever tears
 * down. Escape steps one panel left, closing the panel it leaves only when
 * that panel is the stack's discardable end.
 *
 * Navigation runs through `aberdeen/route`: the URL holds the current panel,
 * and the rest of the arrangement — the panels before it, the ones parked
 * after it, and which are pinned — is stored beside it in the history entry.
 * So back and forward step through whole arrangements of columns, and a reload
 * (or a shared link) brings the same columns back.
 */

// ─── Route table typing ──────────────────────────────────────────────────────

/** Flattens an intersection into a single object type, so hovers read nicely. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * What a `[name=matcher]` matcher name yields. An unrecognised name resolves to
 * `never`, which shows up as an unusable param at the handler rather than
 * quietly typing as `string` (the route key itself throws at mount time).
 */
export type MatcherType<M extends string> = M extends "integer" ? number : never;

/**
 * The params contributed by a single path-template segment: `[x]` a string,
 * `[x=integer]` a number, `[...x]` the rest of the path as one raw string.
 */
export type SegParams<S extends string> =
	S extends `[...${infer Name}]` ? { [K in Name]: string } :
	S extends `[${infer Name}=${infer Matcher}]` ? { [K in Name]: MatcherType<Matcher> } :
	S extends `[${infer Name}]` ? { [K in Name]: string } : {};

/**
 * The params object described by a path template, e.g.
 * `PathParams<"/projects/[id]/tasks/[taskId=integer]">` is
 * `{ id: string; taskId: number }`.
 */
export type PathParams<P extends string> =
	P extends `${infer Head}/${infer Rest}` ? SegParams<Head> & PathParams<Rest> : SegParams<P>;

/** A panel draw function: it receives the panel's {@link Panel} and draws into the current scope. */
export type RouteHandler<P = any> = (panel: Panel<P>) => void;

/**
 * A route table: path templates mapped to panel draw functions. Used as the
 * loose (non-inferred) type; `S.main()` infers a more precise type from the
 * literal you pass, so each handler's `$panel.params` is typed per its key.
 */
export type Routes = Record<string, RouteHandler>;

/**
 * The shape `S.main()`'s `routes` option is checked against: every key types its
 * own handler's `params`. Used as a self-referential generic constraint, which
 * is what makes `$panel.params` infer from the route key.
 */
export type RouteTable<R> = { [K in keyof R & string]: (panel: Panel<Prettify<PathParams<K>>>) => void };

/**
 * What belongs beneath a path that arrives cold, worked out from the params of
 * the path itself. Return the paths shallowest first, or nothing to leave this
 * one to the parent-path derivation.
 */
export type AncestorsHandler<P = any> = (params: P, path: string) => readonly string[] | undefined | void;

/**
 * A table of {@link AncestorsHandler}s keyed by path template, the same way
 * `routes` is — so each one's `params` are matched and typed from its own key
 * rather than parsed out of the path a second time. The keys are checked
 * against the route table, so a stale one is a type error.
 */
export type AncestorTable<R> = {
	[K in keyof R & string]?: (params: Prettify<PathParams<K>>, path: string) => readonly string[] | undefined | void;
};

// ─── The Panel object ─────────────────────────────────────────────────────────

/**
 * What a route handler gets: the params from its route, plus everything the
 * shell needs to know about the panel it is drawing. It's an Aberdeen proxy, so
 * you can set things later, such as a `title` that arrives with your data or
 * `loading` going back to `false`, and the shell keeps up.
 *
 * Search params and the `#hash` belong to the current panel only. Any other
 * panel keeps just its path, so anything a panel needs in order to redraw
 * itself has to live in that path. (A panel browsed away from does get its
 * search and hash back when a crumb makes it current again.)
 */
export interface Panel<P = Record<string, string | number | string[]>> {
	/**
	 * The params matched from this panel's path, typed per its route key:
	 * `[x]` is a `string`, `[x=integer]` a `number`, `[...x]` a `string`.
	 * Read-only.
	 */
	readonly params: P;
	/**
	 * The stack this panel is in — the very object `S.main()` hands back. It is
	 * here as well because a route handler runs *while* that call is still
	 * going, so its return value isn't available to it yet; this always is.
	 */
	readonly stack: PanelStack;
	/** This panel's path, e.g. `"/projects/7"`. Read-only. */
	readonly path: string;
	/**
	 * Names this screen, in the top bar's breadcrumb stack and in
	 * `document.title` while the panel is current. A panel that doesn't set one
	 * borrows the first line of text in its own body, so the stack never shows a
	 * blank — but a borrowed paragraph makes a poor name, so say it yourself.
	 *
	 * It does **not** conjure a heading: naming a screen and heading its content
	 * are different jobs, and a screen that wants its name in its own body
	 * writes it there, where it owns the typography.
	 */
	title?: string;
	/**
	 * This screen's own actions: a couple of buttons, a menu. The shell draws
	 * them — never the panel — and *where* depends on facts only the shell has:
	 * a quiet strip at the top of this panel's column while several columns are
	 * up, and the top bar (where they take the app's own `menu` slot) once the
	 * shell is narrow and this panel is the screen.
	 *
	 * They are drawn in exactly one of those places at a time, so crossing the
	 * threshold redraws them; anything stateful inside (the focus in a search
	 * box) is lost. Buttons and menus are fine.
	 */
	actions?: Slot;
	/**
	 * How wide this panel's column actually is, in pixels — what
	 * {@link Panel.maxWidth} asked for, resolved against the window. Reactive and
	 * read-only, and correct *before* your handler draws, so content that sizes
	 * itself can read it instead of measuring.
	 *
	 * You rarely need it: the shell places the chrome for you. It's for content
	 * that genuinely differs by width, such as a table that becomes a list.
	 */
	readonly width: number;
	/**
	 * Whether this panel is on screen right now: not crowded out from under the
	 * visible run, not parked past its right end, and not on its way out.
	 * Reactive and read-only.
	 *
	 * The one to hang per-panel floating UI on (a FAB, a "3 selected" bar), for
	 * which "am I the current panel?" is the wrong question — two columns can be
	 * visible at once, and both of them are really there.
	 */
	readonly visible: boolean;
	/**
	 * The widest this panel can usefully be. Every panel must work at 360–540px,
	 * because that is what it gets when two columns fit; this says how much
	 * *more* it can take.
	 *
	 * - `"half"` — nothing more. Half the content area (360–540px), so a second
	 *   column fits beside it. For lists and detail forms.
	 * - `"full"` (the default) — the whole content area, up to ~1100px.
	 * - `"screen"` — the whole window, unbounded: boards, wide tables, dense
	 *   dashboards. While one is open the shell itself stretches to the screen
	 *   edges instead of stopping at the standard 1280px page.
	 *
	 * Below the width two columns need, everything takes the content area
	 * whatever it asked for. Widths depend only on the window, never on what
	 * else is open, so opening or closing a panel never resizes another.
	 *
	 * Set it at the top of your handler and the panel is already that wide when
	 * you draw (see {@link Panel.width}); set it later — when your data tells you
	 * — and the panel reflows without being redrawn, keeping its state, while
	 * the columns beside it move over.
	 */
	maxWidth?: "half" | "full" | "screen";
	/**
	 * Set this while you're fetching what the panel needs, and back to `false`
	 * when you're done. A new panel waits a moment before sliding in, so it can
	 * arrive with real content instead of empty; if the wait drags on it slides
	 * in anyway and shows a loading indicator until the flag clears. It only
	 * affects the animation; the stack and the URL never wait for it.
	 */
	loading?: boolean;
	/**
	 * Keeps this panel from being closed by navigation happening *elsewhere*.
	 * Opening a new panel normally closes everything after the panel it came
	 * from; a pinned panel survives that, staying in the stack — parked past the
	 * right edge of the viewport — slotted in beneath the new panel, one crumb
	 * click away. The user toggles it from the crumb's context menu
	 * (right-click or long-press), which is also where the pin shows; setting
	 * it from code does the same thing.
	 *
	 * A pin never blocks an *explicit* close: Escape at the stack's end,
	 * {@link Panel.close}, the crumb menu's Close and `data-panel=replace` all
	 * still close the panel.
	 */
	pinned?: boolean;
	/**
	 * Set this while the panel holds work that must not be lost — a dirty form,
	 * an upload in flight. An unsaved panel cannot be closed, by anything:
	 * navigation that would prune it parks it instead, past the viewport's
	 * right edge, wearing a ● in its crumb — even the browser's back button
	 * only parks it. {@link Panel.close} and the crumb menu's Close refuse,
	 * Escape on it steps left along the stack rather than closing, and closing
	 * the browser tab runs into the browser's own are-you-sure (after which the
	 * shell brings the unsaved panel back on screen).
	 *
	 * Only the app clears it; the user has no toggle. A Save or Discard button
	 * clears it and then closes:
	 *
	 * ```ts
	 * A(() => { $panel.unsaved = $form.dirty || undefined; });
	 * S.button({ content: "Discard", attrs: ".neutral", click: () => {
	 *   $panel.unsaved = false;   // explicitly — see below
	 *   void $panel.close();
	 * }});
	 * ```
	 *
	 * The explicit `unsaved = false` before `close()` matters when the flag is
	 * kept by a reactive scope, as above: resetting the form marks that scope
	 * dirty, but it reruns *after* the running handler — after `close()` has
	 * already been refused.
	 */
	unsaved?: boolean;
	/**
	 * Closes **this** panel, wherever it sits in the stack. Closing the current
	 * panel hands the focus to the panel on its left; closing any other panel
	 * takes just it away, leaving the columns around it where they are, with
	 * their state. Either way it becomes a history entry, so the browser's
	 * back button brings the panel back.
	 *
	 * Resolves `false` if the panel didn't close: it holds
	 * {@link Panel.unsaved} work, it was the only panel on the stack (so
	 * there's nothing to show instead), or another navigation got there first.
	 * The shell's breadcrumbs already travel back, so reach for this when a
	 * screen wants a more explicit way out: a Cancel button, or a Save that
	 * closes.
	 *
	 * @example
	 * ```ts
	 * S.button({ content: "Cancel", attrs: ".neutral", click: () => void $panel.close() });
	 * ```
	 */
	close(): Promise<boolean>;
}

// ─── Path matching ───────────────────────────────────────────────────────────

type Seg =
	| { kind: "lit"; value: string }
	| { kind: "param"; name: string; matcher?: string }
	| { kind: "rest"; name: string };

/**
 * The matchers a `[name=matcher]` segment can use. A matcher returns the param's
 * value, or `undefined` to fail the match, in which case the path falls through
 * to a later route (or to `notFound`) instead of reaching a handler.
 *
 * `integer` deliberately refuses anything that wouldn't survive a round trip
 * back to the same URL: no leading zeroes ("007"), no "-0", no "1.5", "1e3" or
 * "0x10", and nothing past `Number.MAX_SAFE_INTEGER` (where the number would no
 * longer hold the id it came from). Two spellings of one id would otherwise be
 * two different paths, so the same record could sit open in two columns at once.
 * Use a plain `[id]` for ids that aren't safe integers, such as snowflakes.
 */
const MATCHERS: Record<string, (segment: string) => unknown> = {
	integer(segment) {
		if (!/^(0|-?[1-9]\d*)$/.test(segment)) return undefined;
		const n = Number(segment);
		return Number.isSafeInteger(n) ? n : undefined;
	},
};

interface CompiledRoute {
	key: string;
	segs: Seg[];
	draw: RouteHandler;
}

/** Leading slash, no trailing slash (except for the root itself) — as `route.current.path` is. */
function normalizePath(path: string): string {
	let p = String(path).replace(/\/+$/, "");
	if (!p.startsWith("/")) p = `/${p}`;
	return p;
}

function splitPath(path: string): string[] {
	const p = normalizePath(path);
	return p === "/" ? [] : p.slice(1).split("/");
}

/**
 * Turn a path template into segment tokens, throwing on malformed ones. A
 * segment is a param only when it is *entirely* a bracket group, so a literal
 * segment that merely contains brackets (`/v[1]beta`) stays literal. Used for
 * both tables keyed by a path template: `routes` and `ancestors`.
 */
function compileKey(key: string): { key: string; segs: Seg[] } {
	const parts = splitPath(key);
	const segs = parts.map((part, i): Seg => {
		if (!part.startsWith("[") || !part.endsWith("]")) return { kind: "lit", value: part };

		const rest = /^\[\.\.\.([A-Za-z_$][\w$]*)\]$/.exec(part);
		if (rest) {
			if (i !== parts.length - 1) throw new Error(`Staffa: "${part}" must be the last segment of route "${key}"`);
			return { kind: "rest", name: rest[1] };
		}
		const param = /^\[([A-Za-z_$][\w$]*)(?:=([A-Za-z_$][\w$]*))?\]$/.exec(part);
		if (!param) throw new Error(`Staffa: malformed param "${part}" in route "${key}"`);
		const [, name, matcher] = param;
		if (matcher && !(matcher in MATCHERS)) {
			throw new Error(`Staffa: unknown matcher "${matcher}" in route "${key}" (known: ${Object.keys(MATCHERS).join(", ")})`);
		}
		return { kind: "param", name, matcher };
	});
	return { key, segs };
}

/** Percent-decode a path segment, leaving it alone when it isn't valid encoding. */
function decodeSeg(value: string): string {
	try { return decodeURIComponent(value); } catch { return value; }
}

function matchRoute(r: { segs: Seg[] }, segments: string[]): Record<string, any> | null {
	const params: Record<string, any> = {};
	for (let i = 0; i < r.segs.length; i++) {
		const seg = r.segs[i];
		if (seg.kind === "rest") {
			// One-or-more remaining segments, handed over exactly as they appear in
			// the URL. Decoding first and joining would be lossy: an encoded slash
			// inside a segment would come back indistinguishable from a separator.
			if (i >= segments.length) return null;
			params[seg.name] = segments.slice(i).join("/");
			return params;
		}
		if (i >= segments.length) return null;
		const value = segments[i];
		if (seg.kind === "lit") {
			if (value !== seg.value) return null;
		} else if (seg.matcher) {
			// A segment the matcher rejects fails the match, so junk falls through
			// to later routes (or notFound) instead of reaching a handler.
			const matched = MATCHERS[seg.matcher](value);
			if (matched === undefined) return null;
			params[seg.name] = matched;
		} else {
			params[seg.name] = decodeSeg(value);
		}
	}
	return r.segs.length === segments.length ? params : null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The one duration every bit of shell motion shares: the enter/exit fades, the
 * `left` moves of columns shifting sideways, the ensemble-width transition the
 * chrome follows (see `--s-shell-w` in main.ts), and the narrow-screen nav
 * panel's slide. Published as the `--s-panel-ms` custom property below, so CSS
 * and JS can't drift apart.
 *
 * Short enough to read as *the screen responded*, rather than as an animation
 * being played at you: a panel arriving is navigation, and navigation should
 * feel instant even when it moves.
 */
const PAGE_MS = 250;
/** How long a freshly pushed `loading` panel holds its enter animation. */
const LOADING_HOLD_MS = 300;
/**
 * The standard page width: sidebar plus content area, capped by the window.
 * `"full"` fills the content-area part of this exactly; only a `"screen"`
 * page makes the shell grow past it.
 */
const SHELL_PX = 1280;
/** Don't pair smalls when half the content area would be narrower than this. */
const PAIR_MIN_PX = 360;
/**
 * Panels are layered by their depth in the stack, two `z-index` steps per panel:
 * a panel sits on the odd layer for its depth, and a *closing* one drops to the
 * even layer just below, where it is frozen for the length of its fade. So a
 * panel that replaces another comes in over it, while one that closes fades out
 * over whatever it was covering — which is the way round both should read.
 */
const LAYER_STEP = 2;

// ─── Module-level styling ────────────────────────────────────────────────────

A.insertGlobalCss({
	":root": `--s-panel-ms:${PAGE_MS}ms`,
	// The clipping viewport that the columns slide through. Panels are absolutely
	// positioned inside it, with their width and x offset set from JS (see
	// `layout()`), so they can animate between arrangements. `isolation` keeps the
	// layers they stack themselves in (see LAYER_STEP) to themselves: the region
	// as a whole still sits under the shell's own chrome — the sticky top bar, and
	// the nav panel that slides across the body — however deep the stack gets.
	// The region paints the panel's sheen over its own box, and every panel shows
	// a slice of that same gradient (see `.s-panel` below), so the columns and
	// the ground beside them are one continuous surface.
	".s-panels":
		"flex:1 min-width:0 min-height:0 position:relative overflow:hidden isolation:isolate " +
		SURFACE_SHEEN,
	".s-panel": {
		// A panel rests at a plain `left` offset and carries no transform: a
		// transformed element is composited, which costs it subpixel text
		// antialiasing. `transform` is used only to play the enter/exit slides,
		// where the compositing is what makes them cheap. There is deliberately no
		// `width` transition: a width changes only when the window resizes or when
		// the panel itself asks for another layout, and animating one would reflow
		// the column's content on every frame of it.
		// Every duration is `--s-panel-ms`, so a column's move, its neighbour's fade
		// and the chrome recentering around them all run as one motion. The drift
		// eases out (it should read as a slow settle) while the fade runs *linear*
		// across the whole duration — an eased opacity spends its last stretch near
		// zero, which looks like the panel vanishing rather than fading.
		// No `overflow:hidden` here: the scroll container below clips the content
		// itself.
		// Layering is set from JS (`layout()` and `beginClose`) rather than left to
		// DOM order: a closing panel is no longer part of the reactive list, so
		// where its element sits among the live ones is Aberdeen's business, not a
		// thing to depend on. `LAYER_*` says what the numbers mean.
		//
		// Every panel paints an opaque ground, because panels animate over one
		// another — entering, leaving, being crowded out — and two transparent ones
		// mean text sliding over text. It takes the panel's own sheen, the one
		// `.s-s, body` paints in theme.ts, resolved here against the inherited
		// `--s-bg` (a panel is not a surface, so it has to paint it itself).
		//
		// Painted per panel, over the panel's own box, which is as good as it
		// needs to be: the sheen is a 9%-either-way wash over a whole column, so
		// two columns' worth of it meeting at a hairline is not something the eye
		// picks out. The region (`.s-panels` above) paints the same wash, so the
		// ground beside a lone column matches it just as closely.
		"&":
			"position:absolute top:0 bottom:0 left:0 display:flex flex-direction:column " +
			SURFACE_SHEEN + " " +
			"visibility:visible transition: left var(--s-panel-ms) ease, transform var(--s-panel-ms) ease-out, opacity var(--s-panel-ms) linear, visibility 0s;",
		// The hairline between two columns, fading out at both ends — the same
		// treatment as the sidebar's `.s-nav-sep`. Columns tile the area with no
		// gutter between them: each already brings its own `$3` of padding, which
		// keeps two columns' *contents* comfortably apart, while a gutter on top
		// of that only opened a strip of the panel's own ground between two columns
		// painting theirs. So this sits exactly on the boundary — and an
		// edge-to-edge column (`A("p:0")`) really does reach the line bounding it.
		"&.s-panel-sep::before":
			"content:'' position:absolute left:0 top:0.6rem bottom:0.6rem width:1px z-index:1 " +
			"background: linear-gradient(to bottom, transparent, $s-faint 18%, $s-faint 82%, transparent);",
		// One vocabulary for every arrival and departure: a gradual fade over a short,
		// slow drift — 8cqw (`cqw`: `.s-main` is the container). Panels appear and
		// leave at the right edge; being crowded out at the left edge is its mirror.
		//
		// The start state of an enter, adopted with transitions off and then
		// dropped, which is what makes the panel settle instead of jumping.
		"&.s-panel-enter": "opacity:0 transition:none transform: translateX(8cqw);",
		// On its way out: fading where it stands, drifting the same short distance,
		// and out of reach while it does. It leaves the DOM when the fade itself
		// ends (see `playExit`), never part-way through it.
		"&.s-panel-closing": "opacity:0 pointer-events:none transform: translateX(8cqw);",
		// Off screen but open: crowded out from under the visible run at the left
		// edge (`hidden`), or right of the current panel, parked past the right
		// edge (`parked`) — the two are mirror images. Either keeps its DOM (and
		// thus its scroll position and half-typed forms), so `display:none` is out
		// — `visibility` takes it out of the rendering instead, but only once the
		// fade has played: a transitioned `visibility` counts as *visible* for the
		// whole duration and flips at the very end. Revealing it again uses the
		// rule above (`visibility 0s`), so it comes back instantly.
		"&.s-panel-hidden, &.s-panel-parked":
			"opacity:0 visibility:hidden " +
			"transition: left var(--s-panel-ms) ease, transform var(--s-panel-ms) ease-out, opacity var(--s-panel-ms) linear, visibility var(--s-panel-ms);",
		"&.s-panel-hidden": "transform: translateX(-8cqw);",
		"&.s-panel-parked": "transform: translateX(8cqw);",
	},
	// The scroll container, with the column's own padding. A scrollbar here is
	// left flush against the column's right edge — unlike content mode's, which
	// insets one from the shell edge to line up with the bar above it. A column
	// has something better to line up with: the hairline the next column starts
	// at, or the edge of the content area. Both want the bar hard against them,
	// and an inset would leave a strip of nothing between the two.
	".s-panel > .s-content": "flex:1 min-height:0 overflow-y:auto overflow-x:hidden p:$3",
	// A panel's actions on a wide shell: a quiet strip at the column's top-right,
	// above the scroll area (never sticky inside it). On a narrow shell the top
	// bar carries them instead, and no strip is drawn at all.
	".s-panel-actions": "display:flex align-items:center justify-content:flex-end gap:$1 flex-shrink:0 padding: $3 $3 0;",
	// The breadcrumb stack the top bar shows: every open panel, oldest first,
	// the ones on screen right now in bold ink (see `drawCrumbs`). One row that
	// scrolls sideways when the bar is tight — scrollbarless, with a fade at
	// whichever edge has more stack behind it, so the cut-off reads as "keep
	// going" rather than as the stack simply ending.
	// The stack is a `.s-strip` (see tabs.ts), so the scrolling, the hidden
	// scrollbar and the ‹ / › come with it; all that is left to say is the gap
	// between a crumb and its chevron.
	".s-crumbs > .s-strip-row": "gap:$m1",
	".s-crumb": {
		// Quiet ink for the stack, full ink and weight for the panels on screen:
		// the weight change alone is ambiguous in a short crumb, the colour alone
		// too subtle. No padding of its own — the first crumb has to start on the
		// same pixel as the app's name above it, and the gap below spaces the row.
		// `flex-shrink:0` because the crumbs are the strip's flex items and carry
		// `overflow:hidden`, which resolves their automatic minimum size to zero:
		// left to shrink they would ellipsise themselves down to stubs rather than
		// overflow, and the stack would never scroll. One long title still caps at
		// 14rem — that is this crumb's own business, not the row running out.
		"&":
			"flex-shrink:0 font-size:0.85em line-height:1.5 fg:$s-muted text-decoration:none " +
			"white-space:nowrap max-width:14rem overflow:hidden text-overflow:ellipsis " +
			"transition: color 0.12s;",
		"&.s-crumb-on": "font-weight:600 fg:$s-text",
		// The same hover treatment as a menu item. The panel you are on is a plain
		// span rather than a link, so it needs no `:not()` guard here.
		"a&:hover": "filter:none color: color-mix(in lab, $s-primary 33%, $s-text);",
		// The pin of a pinned panel, sitting inline just before its title. Filled:
		// at crumb size the icon's hairline strokes alias into a wobble, while the
		// body path filled solid reads as the classic pinned-tab pushpin.
		"svg.s-crumb-pin": "vertical-align:-0.12em margin-right:0.3em opacity:0.8 fill:currentColor",
		// The ● of a panel holding unsaved work — the editors' dirty mark, filled
		// solid for the same reason as the pin.
		"svg.s-crumb-unsaved": "vertical-align:0.08em margin-right:0.3em fill:currentColor",
	},
	// A slash, not a chevron: the stack is a path, and a path's separator is what
	// the URL itself uses. It also has to stay clearly *unlike* the ‹ / › the
	// strip grows when the stack overflows (see `scrollStrip` in tabs.ts) — two
	// near-identical chevrons, one meaningful and one a button, read as a bug.
	"svg.s-crumb-sep": "flex-shrink:0 opacity:0.4",
	// A window resize (and the very first pass) must track the window instantly,
	// not rubber-band 450ms behind it: the layout engine raises this class on the
	// shell for exactly those passes, applies the new geometry, and drops it
	// after a forced reflow. Beats the standing transitions on specificity.
	".s-main.s-shell-snap .s-panel": "transition:none",
	// A minimal "still fetching" hint, centred over the panel's content (which
	// stays mounted underneath, so it can fill in reactively).
	".s-panel-loading": {
		"&": "position:absolute inset:0 display:flex align-items:center justify-content:center gap:$1 pointer-events:none",
		"i": "width:0.5rem height:0.5rem r:50% background:$s-muted opacity:0.45 animation: s-panel-pulse 1s ease-in-out infinite;",
		"i:nth-child(2)": "animation-delay:0.15s",
		"i:nth-child(3)": "animation-delay:0.3s",
	},
	"@keyframes s-panel-pulse": {
		"0%, 100%": "opacity:0.25 transform:scale(0.8)",
		"50%": "opacity:0.7 transform:scale(1)",
	},
});

// ─── Panel entries ───────────────────────────────────────────────────────────

/**
 * A {@link Panel} as the controller holds it: the same object the handler gets,
 * minus the `readonly`s. `width` and `visible` are read-only *to the app* —
 * they are facts about the panel, not requests — but the shell keeps them up to
 * date by writing them, which is what makes reading them reactive.
 */
type PanelState = { -readonly [K in keyof Panel<any>]: Panel<any>[K] };

interface PanelEntry {
	/**
	 * Opaque to Aberdeen: an entry rides inside the reactive `$state` and
	 * `$open` collections, but is itself the controller's plain state — its
	 * reactive faces are `$panel` (the app's) and `$ui` (the shell's own).
	 * Without this, reading an entry back out of either collection would wrap
	 * it in a proxy, DOM element, draw function and all.
	 */
	readonly [OPAQUE]: true;
	/**
	 * The DOM sort key: one shared counter, so panels sit in creation order.
	 * Deliberately never updated: rewriting it would make Aberdeen redraw the
	 * panel, throwing away the scroll position and half-typed forms rule 5
	 * promises to keep. So the DOM order drifts from the stack order once
	 * panels are spliced or restored out of sequence — invisible, since panels
	 * are absolutely positioned, beyond a small drift in tab order.
	 */
	order: number;
	path: string;
	$panel: PanelState;
	draw: RouteHandler;
	/** Extra per-panel UI state, split off `$panel` so the app can't see it. */
	$ui: {
		holding: boolean;
		/**
		 * The title borrowed from the panel's first line of text, for a panel that
		 * never set one. Kept beside `$panel.title` rather than written into it,
		 * so the app's own field only ever holds what the app wrote — and so a
		 * body redraw can refresh the borrowed text, which a write into `title`
		 * would have frozen.
		 */
		fallback?: string;
	};
	el?: HTMLElement;
	/**
	 * The search params and hash the URL held while this panel was last the
	 * current panel, stashed when the focus moves off it and restored when a
	 * crumb (or any link) makes it current again. Search and hash belong to
	 * the current panel only, so this is the one place they survive a visit
	 * elsewhere along the stack.
	 */
	search?: Record<string, string>;
	hash?: string;
	/** Set once the panel is on its way out, playing its exit animation. */
	closing?: boolean;
	/** Set while an enter animation is still to be played. */
	enter?: boolean;
	/** Whether the panel has been through a full layout pass (and so may animate). */
	placed?: boolean;
	/** Whether its `loading` hold has already expired, so it can't hold again. */
	holdDone?: boolean;
	/** What the panel asks for, kept in step with its `$panel.maxWidth`. */
	maxWidth: "half" | "full" | "screen";
	/**
	 * The width it was last laid out at. Set before the panel's content is first
	 * drawn, so that content has a real box to measure itself against. Visible
	 * panels get a fresh value every pass (widths are a pure function of the
	 * content area and small-pairing); hidden and closing panels keep this, so
	 * nothing invisible ever reflows.
	 */
	width: number;
}

/**
 * What the shell measures out to, and with it the width every panel size gets.
 * A pure function of the window, so it is the same for every panel in a pass.
 */
interface Geometry {
	/** The body row: everything the columns and the sidebar share. */
	total: number;
	/** What sits beside the columns — the sidebar and its hairline, if shown. */
	chrome: number;
	/** Half the standard content area, or all of it when a half would be too narrow. */
	half: number;
	/** The standard content area: the 1280px page minus the chrome. */
	full: number;
	/** Everything the window has beside the chrome, with no upper limit. */
	screen: number;
}

/**
 * One state of the stack: the open paths, oldest first, and which of them is
 * the current panel. The panels before `focus` sit (or are crowded out) to the
 * current panel's left; the ones after it are parked past the right edge of the
 * viewport. What a history entry describes, and what every navigation is
 * expressed as a change to.
 */
interface Arrangement {
	stack: string[];
	focus: number;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/** Options the stack needs from its shell. */
export interface PanelStackOptions {
	routes: Routes;
	notFound?: RouteHandler<{}>;
	/** What to open beneath a path that arrives cold. See {@link MainOptions.ancestors}. */
	ancestors?: Record<string, AncestorsHandler | undefined>;
	/** Set `false` to show only the current panel, however much room there is. */
	stacking?: boolean;
	/** The shell's own title, used as the suffix of `document.title`. */
	title?: unknown;
	/**
	 * The shell's live narrow flag (see `main()`), which decides where a panel's
	 * chrome goes: in its own column, or promoted into the top bar. Shared rather
	 * than measured again here, so the bar and the columns can't disagree about
	 * which regime they are in.
	 */
	$shell: { narrow: boolean };
}

/**
 * The URL is global, so two routed shells would fight over it. This is only a
 * guard against that — the stack is reached through the object `main()` hands
 * back, never through a module-level singleton.
 */
let mounted = false;

/**
 * The panel stack behind a routed `S.main()`, and what that call hands back:
 * the open {@link Panel}s, which of them is current, and the four ways to
 * change that. Everything on it is scoped to its own shell.
 *
 * Every navigation settles asynchronously (closes travel through the
 * browser's history), so the methods resolve once it has: `true` when it
 * landed, `false` when it didn't — an unsaved panel refused to close, an
 * app-registered route guard said no, or another navigation superseded it.
 * Ignore the promise unless you care.
 *
 * @example
 * ```ts
 * const shell = S.main({ title: "Trackle", routes: { ... } });
 *
 * S.button({ content: "New task", click: async () => {
 *   const task = await createTask();
 *   shell.pushPanel(`/tasks/${task.id}`);
 * }});
 * ```
 */
export interface PanelStack {
	/**
	 * The open panels, oldest first — the stack itself, as live objects rather
	 * than a copy of it. Writing through one is how you pin a panel, or rename
	 * it, from outside its own handler. Reactive on the stack's shape; don't
	 * hold a {@link Panel} across a navigation, since a closed one is dropped
	 * here while its element plays out its exit.
	 */
	readonly panels: readonly Panel[];
	/** Index into {@link PanelStack.panels} of the current panel. Reactive. */
	readonly currentPanelIndex: number;
	/**
	 * The current panel — shorthand for `panels[currentPanelIndex]`, and
	 * `undefined` only while the stack is still empty. Reactive on *which*
	 * panel is current; the fields you then read (`title`, `actions`, …) are
	 * reactive in their own right.
	 */
	readonly currentPanel: Panel | undefined;
	/**
	 * Opens `path` in a new panel on top of the current one, closing the
	 * unpinned panels that were after it (pinned ones stay, sliding in beneath
	 * the new panel).
	 *
	 * The same rules as a link click apply: pushing a path that is already open
	 * goes back to it — a focus move along the stack, closing nothing — rather
	 * than opening it twice, and a panel holding {@link Panel.unsaved} work is
	 * never closed, only parked. That's what a plain link does, and what
	 * `data-panel=push` says outright.
	 */
	pushPanel(path: string): Promise<boolean>;
	/**
	 * Opens `path` in place of the current panel, which closes. The panels
	 * beneath it stay as they are. That's what a `data-panel=replace` link does.
	 */
	replacePanel(path: string): Promise<boolean>;
	/**
	 * Opens `path` as a whole stack rather than on top of what's there: the same
	 * thing a nav item or a fresh tab does. Without `beneath`, the stack under it
	 * is worked out the way a cold link's is (see {@link MainOptions.ancestors});
	 * with it, the paths you give are opened underneath, shallowest first.
	 *
	 * That's the one for a screen whose URL doesn't say where it belongs — the
	 * thread a notification opens — and for seeding a stack from code in general.
	 * Panels the new stack also holds stay as they are; ones it drops close,
	 * except panels with {@link Panel.unsaved} work, which stay, parked.
	 *
	 * A `data-panel=open` link does the same thing (without a `beneath`): it
	 * leaves the panel it sits in behind rather than stacking on it, which is
	 * what a link to somewhere else in the app wants — a search hit, a mention.
	 *
	 * @example
	 * ```ts
	 * shell.openPanelStack(`/thread/${id}`, [`/mailbox/${mailboxId}`]);
	 * ```
	 */
	openPanelStack(path: string, beneath?: readonly string[]): Promise<boolean>;
	/**
	 * Closes the current panel, or, given a `path`, whichever panel is open at
	 * it. Closing the current panel hands the focus to the panel on its left;
	 * closing any other panel takes just it away, leaving the columns around it
	 * exactly as they are, with their state. Either way it becomes a history
	 * entry, so the browser's back button brings the panel back.
	 *
	 * Resolves `false` if the panel didn't close: it holds {@link Panel.unsaved}
	 * work, `path` isn't open, it was the stack's only panel, or another
	 * navigation got there first.
	 */
	closePanel(path?: string): Promise<boolean>;
}

/**
 * The controller behind a routed shell. It implements {@link PanelStack} —
 * the app-facing face, and the only part of it that is Staffa API — and on
 * top of that draws the columns and the breadcrumbs for `main()`, which
 * constructs it.
 */
export class PanelStackController implements PanelStack {
	/**
	 * Kept out of Aberdeen's proxy wrapping: this is a class instance holding
	 * DOM nodes, timers and route handlers, and it rides inside every
	 * {@link Panel.stack}. Its reactivity doesn't need the wrapper — it comes
	 * from `$state` and the panels, which are proxies in their own right.
	 */
	readonly [OPAQUE] = true;
	private compiled: CompiledRoute[];
	/** The `ancestors` table, compiled like the routes it is keyed by. */
	private ancestors: { key: string; segs: Seg[]; fn: AncestorsHandler }[];
	private opts: PanelStackOptions;
	/**
	 * The live stack, oldest first (closing panels are no longer part of it),
	 * and which of its panels is current — the one reactive fact about the
	 * stack's *shape*. The getters, the crumbs and `document.title` subscribe
	 * to it simply by reading it; each commit publishes the next shape by
	 * assigning a fresh `live` array. The entries themselves are opaque (see
	 * {@link PanelEntry}), so the array carries their comings, goings and
	 * order — nothing deeper; a panel's own facts stay separately reactive on
	 * its `$panel`, which is what lets a panel rename itself without the
	 * stack redrawing.
	 *
	 * One rule makes this safe to touch from anywhere: **queries subscribe,
	 * commands peek**. The getters below are the queries. Every navigation
	 * entry point (`navigate`, `closePath`, `back`, …) wraps itself in
	 * `A.peek`, so an app calling one from inside a reactive scope (a
	 * redirect in a route handler, say) can't subscribe that scope to the
	 * very stack it is changing — and everything those commands call through
	 * to, `propose` and `commit` included, inherits the same guarantee and
	 * reads the stack plainly.
	 */
	private $state = A.proxy({ live: [] as PanelEntry[], focus: 0 });
	/**
	 * The open panels again, keyed by path — the shape as the DOM consumes it.
	 * `drawColumns`' `onEach` mounts and unmounts panels by key, so a panel
	 * spliced out of the middle of the stack touches exactly one key, and the
	 * DOM of the retained columns — scroll positions, half-typed forms — is
	 * left alone. (Iterating `live` itself would key panels by array index,
	 * and a splice renumbers every index after it, redrawing them all.) A
	 * key's value is its entry, by reference, and is never reassigned, so a
	 * panel only ever redraws wholesale when its path closes.
	 */
	private $open = A.proxy<Record<string, PanelEntry>>({});
	/** Feeds {@link PanelEntry.order}: one shared counter, so keys never tie. */
	private nextOrder = 0;
	private containerEl?: HTMLElement;
	/** The shell's measurements, shared by everything drawn since they were taken. */
	private geom?: Geometry;
	/** The body width at the last layout; a change means a window resize → snap. */
	private lastBodyW = -1;
	private layoutQueued = false;
	private timers = new Set<ReturnType<typeof setTimeout>>();
	/** The arrangement the navigation in flight is heading for; see {@link intended}. */
	private intent: Arrangement | null = null;
	/** The navigation the router hasn't settled yet, if any. */
	private settling: Promise<boolean> | null = null;
	/** The route last seen by the observer, for stashing a left panel's query. */
	private lastSeen: { path: string; search: Record<string, string>; hash: string } | null = null;
	/** The one navigation waiting behind it; see {@link issue}. */
	private queued: { run: () => boolean | Promise<boolean>; settle: (ok: boolean) => void } | null = null;

	constructor(opts: PanelStackOptions) {
		if (mounted) {
			throw new Error("Staffa: only one routed S.main() (one with `routes`) can be active at a time");
		}
		mounted = true;
		this.opts = opts;
		this.compiled = Object.entries(opts.routes).map(([key, draw]) => ({ ...compileKey(key), draw }));
		this.ancestors = Object.entries(opts.ancestors ?? {})
			.filter((entry): entry is [string, AncestorsHandler] => entry[1] != null)
			.map(([key, fn]) => ({ ...compileKey(key), fn }));

		// Commit the stack whenever the URL or its snapshot changes — the initial
		// load, our own navigations, and browser back/forward. There is no route
		// guard of the shell's own to pass first: closes are refused up front
		// (`closePath` on an unsaved panel) or repaired at the commit (`propose`
		// keeps unsaved panels a navigation would drop), so a guard the app
		// itself registered with `route.setGuard` — an auth redirect, say — is
		// left exactly where it is and keeps working untouched.
		A(() => {
			const target = this.computeTarget();
			// Subscribed (not peeked) deliberately: a search/hash change with the
			// path staying put must refresh `lastSeen` too, or the next stash would
			// restore stale ones.
			const search = { ...route.current.search };
			const hash = route.current.hash;
			A.peek(() => {
				// Stash the query of the panel the URL just left on that panel, for
				// when a crumb brings it back (see PanelEntry.search). Done here, on
				// the shared pipeline, so every origin is covered alike: the stack's
				// own navigations, an app's `route.go()`, and browser back/forward.
				const prev = this.lastSeen;
				if (prev && prev.path !== route.current.path) {
					const entry = this.$state.live.find((e) => e.path === prev.path);
					if (entry) {
						entry.search = prev.search;
						entry.hash = prev.hash;
					}
				}
				this.lastSeen = { path: route.current.path, search, hash };
				this.propose(target);
				// A history entry that doesn't describe an arrangement — the initial
				// load, or an app's own `route.go()` — is stamped with the one it
				// just produced: a reload restores the same columns, and a later
				// `route.back()` can recognize the entry (its matching wants the
				// `panels`/`parked` keys present, not merely compatible).
				if (!Array.isArray(route.current.state.panels)) {
					Object.assign(route.current.state, this.stateFor({ stack: this.paths(), focus: this.$state.focus }));
				}
			});
		});

		this.interceptLinks();
		this.watchTitle();
		this.guardTabClose();

		A.clean(() => {
			for (const t of this.timers) clearTimeout(t);
			this.timers.clear();
			// Nothing is going to navigate a shell that isn't there: whatever was
			// waiting its turn is answered rather than left hanging.
			this.queued?.settle(false);
			this.queued = null;
			mounted = false;
		});
	}

	// ── Stack derivation ───────────────────────────────────────────────────

	/** Resolve a path to its route handler + params, falling back to `notFound`. */
	private resolve(path: string): { draw: RouteHandler; params: Record<string, any> } {
		const segments = splitPath(path);
		for (const r of this.compiled) {
			const params = matchRoute(r, segments);
			if (params) return { draw: r.draw, params };
		}
		return { draw: this.opts.notFound ?? drawDefaultNotFound, params: {} };
	}

	private matches(path: string): boolean {
		const segments = splitPath(path);
		return this.compiled.some((r) => matchRoute(r, segments) != null);
	}

	/**
	 * The stack for origin-less navigation: a cold deep link, a nav item, a
	 * `route.go()` — anything arriving without a panel to build on and without a
	 * snapshot to restore.
	 *
	 * The app's {@link PanelStackOptions.ancestors} gets first say, since only it
	 * can know what belongs under a path that doesn't spell its own context out
	 * (a `/thread/[id]` reached from a notification). Failing that — or when it
	 * has no opinion — every prefix of the path is probed against the route table
	 * and the matching ones become the stack. Either way, a path with no route is
	 * skipped rather than opened as a "not found" column, so an app that doesn't
	 * want one screen stacked under another simply doesn't route it. The path
	 * itself always ends the derived stack, matched or not.
	 */
	private deriveStack(path: string): string[] {
		const top = normalizePath(path);
		const asked = this.askAncestors(top);
		const beneath = asked ? asked.map(normalizePath) : this.prefixesOf(top);
		const stack: string[] = [];
		for (const ancestor of beneath) {
			if (ancestor !== top && !stack.includes(ancestor) && this.matches(ancestor)) stack.push(ancestor);
		}
		stack.push(top);
		return stack;
	}

	/**
	 * Ask the `ancestors` table what belongs beneath `path`. The first key that
	 * matches answers — with its own matched params, so it never has to take the
	 * path apart itself — and `undefined` from it means "no opinion", leaving the
	 * path to the prefix derivation just as an unlisted one is.
	 */
	private askAncestors(path: string): readonly string[] | undefined {
		const segments = splitPath(path);
		for (const entry of this.ancestors) {
			const params = matchRoute(entry, segments);
			if (params) return entry.fn(params, path) ?? undefined;
		}
		return undefined;
	}

	/** Every prefix of `path` that has a route, shallowest first. */
	private prefixesOf(path: string): string[] {
		const segments = splitPath(path);
		const found: string[] = [];
		for (let i = 1; i < segments.length; i++) found.push("/" + segments.slice(0, i).join("/"));
		return found;
	}

	/**
	 * The pinned panels among `stack`, in order, minus `omit` — the ones a
	 * navigation must carry along rather than close. Pin flags live on the
	 * panels themselves, so a path without a live panel can't be pinned.
	 */
	private pinnedIn(stack: readonly string[], omit: (string | null | undefined)[]): string[] {
		return stack.filter((path) => {
			if (omit.includes(path)) return false;
			return this.$state.live.find((e) => e.path === path)?.$panel.pinned === true;
		});
	}

	/** Whether the panel open at `path` (if any) holds unsaved work. */
	private unsavedAt(path: string | undefined): boolean {
		return this.$state.live.find((e) => e.path === path)?.$panel.unsaved === true;
	}

	/**
	 * The arrangement a route implies: its snapshot around its path, or —
	 * without a snapshot — derived, with the new panel current at the end and
	 * any pinned panels carried along beneath it.
	 *
	 * The snapshot reads subscribe — they are the URL's, exactly what the
	 * route observer is for. The derivation is peeked instead: it reads the
	 * live stack for its pins, which is the very thing that observer rewrites,
	 * and subscribing to it would re-run the observer once per commit.
	 */
	private targetFor(path: string, state: Record<string, any>): Arrangement {
		const before = Array.isArray(state?.panels) ? state.panels.map(String) : null;
		if (before) {
			const after = Array.isArray(state.parked) ? state.parked.map(String) : [];
			// A stack never holds the same path twice: rendering reconciles by path,
			// so a duplicate would leave a permanently element-less entry that stalls
			// the layout. Our own states are clean, but `route.go` accepts
			// hand-written ones — drop duplicates rather than wedge.
			const cur = normalizePath(path);
			const seen = new Set([cur]);
			const uniq = (paths: string[]) =>
				paths.map(normalizePath).filter((p) => !seen.has(p) && !!seen.add(p));
			const beforeUnique = uniq(before);
			return { stack: [...beforeUnique, cur, ...uniq(after)], focus: beforeUnique.length };
		}
		return A.peek(() => {
			const base = this.deriveStack(path).slice(0, -1);
			const stack = [...base, ...this.pinnedIn(this.paths(), [...base, normalizePath(path)]), normalizePath(path)];
			return { stack, focus: stack.length - 1 };
		});
	}

	/** The arrangement the current history entry asks for. Subscribes to path + snapshot. */
	private computeTarget(): Arrangement {
		return this.targetFor(route.current.path, route.current.state);
	}

	// ── Commit pipeline ────────────────────────────────────────────────────

	private paths(): string[] {
		return this.$state.live.map((e) => e.path);
	}

	/**
	 * Adopt an arrangement proposed by the URL — after repairing it: panels
	 * holding unsaved work are never torn down by a navigation, wherever it
	 * came from — a link, a nav item, even a browser back to an entry from
	 * before the panel existed. Whatever the target drops, they stay, parked
	 * after the current panel and wearing the ● that says why. (They are
	 * deliberately not written into history entries: the work they protect
	 * lives in the page's DOM, which a reload clears anyway.)
	 */
	private propose(target: Arrangement): void {
		const kept = this.$state.live
			.filter((e) => !target.stack.includes(e.path) && e.$panel.unsaved)
			.map((e) => e.path);
		if (kept.length) target = { stack: [...target.stack, ...kept], focus: target.focus };
		if (sameStack(this.paths(), target.stack) && target.focus === this.$state.focus) return;
		this.commit(target, route.current.nav);
	}

	/**
	 * Apply a target arrangement: unmount what's gone, mount what's new, animate
	 * the difference.
	 *
	 * Reconciliation is BY PATH (a stack can't hold the same path twice, so that's
	 * well-defined): a panel present in both stacks stays mounted *even if its
	 * index shifted*, which is what lets a panel be spliced out of the middle
	 * (§7) without disturbing the columns above it. A common-prefix diff would
	 * remount every one of them, throwing away exactly the scroll and form state
	 * rule 5 promises to keep.
	 */
	private commit(target: Arrangement, nav: string): void {
		// The panels this commit mounts size themselves as they draw, so make them
		// measure the shell as it is now rather than trusting the last pass's numbers.
		this.geom = undefined;
		// Pin flags for panels this commit *creates* — a reload, or a cold
		// restore. Live panels keep their own flag: a pin is the user's mark on
		// the panel, not part of where back/forward travel.
		const pinned = route.current.state.pinned;
		const seedPins = new Set<string>(Array.isArray(pinned) ? pinned.map(String) : []);
		const existing = new Map(this.$state.live.map((entry) => [entry.path, entry]));
		const next: PanelEntry[] = [];
		for (const path of target.stack) {
			const kept = existing.get(path);
			if (kept) {
				// Retained: it just takes its new place in the stack. Its `order` (the
				// DOM sort key) deliberately stays put — see PanelEntry.order.
				existing.delete(path);
				next.push(kept);
				continue;
			}
			const entry = this.createEntry(path, next.length <= target.focus, seedPins.has(path));
			// An initial load just appears, and so do panels *revealed* by a back —
			// they belong underneath the ones sliding away. Everything else enters at
			// the right edge, a replacement exactly like a push.
			if (nav !== "load" && nav !== "back") entry.enter = true;
			next.push(entry);
			this.$open[path] = entry;
		}
		// Whatever the target no longer holds leaves the same way: fading out over
		// the right edge, which is also where its replacement (if any) comes in from.
		for (const entry of existing.values()) this.beginClose(entry);
		this.$state.live = next;
		this.$state.focus = Math.min(target.focus, next.length - 1);
		this.scheduleLayout();
	}

	private createEntry(path: string, visible: boolean, pinned: boolean): PanelEntry {
		const { draw, params } = this.resolve(path);
		const entry = {
			[OPAQUE]: true,
			order: this.nextOrder++,
			path,
			draw,
			$ui: A.proxy({ holding: false }),
			maxWidth: "full" as const,
			width: 0,
		} as PanelEntry;
		// `close` closes *this* panel, current or not. It resolves the panel's
		// place in the stack at call time, so it keeps working after a splice has
		// moved it — and quietly resolves false once the panel is gone.
		//
		// `visible` starts at what the panel's place implies: shown when it sits
		// at or before the current panel (a pushed panel always does), hidden when
		// it is restored already parked. `width` is filled in by the sizing scope
		// in `drawPanel` before the handler draws.
		entry.$panel = A.proxy({
			stack: this,
			params,
			path,
			width: 0,
			visible,
			pinned: pinned || undefined,
			close: () => this.closePath(entry.path),
		}) as PanelState;
		return entry;
	}

	/**
	 * Take a panel out of the shell. The *scope* goes now: its cleaners run this
	 * tick, so whatever the panel registered with `A.clean` — subscriptions,
	 * timers, an open portal — is torn down when the panel closes, not when its
	 * animation is over. Only the element lingers, to play that animation, which
	 * is what the `destroy=` hook in `drawPanel` is for: Aberdeen hands the
	 * element to {@link playExit} instead of removing it.
	 */
	private beginClose(entry: PanelEntry): void {
		entry.closing = true;
		// It is on its way out, so it is no longer "on screen" as far as anything
		// hanging off `$panel.visible` is concerned — even though its element lingers
		// to play the fade.
		entry.$panel.visible = false;
		// Frozen one layer below where it was, which is still above everything it
		// was covering: it fades out over the panel it uncovers, and under the one
		// that takes its place (see LAYER_STEP). Set here, while the element is
		// still ours — a moment later the scope, and with it `entry.el`, is gone.
		if (entry.el) entry.el.style.zIndex = String(LAYER_STEP * this.$state.live.indexOf(entry));
		delete this.$open[entry.path];
	}

	/**
	 * A closed panel's send-off, run by Aberdeen once the panel's scope is gone (so
	 * the content it shows is frozen, which is exactly what a departing column
	 * should be): it fades where it stands, inert, and leaves the DOM when the fade
	 * itself ends. Removing it on a fixed timer instead would race the transition —
	 * pull the element a frame early and the panel appears to fade half-way and
	 * then vanish. The timeout is just a fallback for when no `transitionend` is
	 * coming at all (transitions off, or an element that never got placed).
	 */
	private playExit(entry: PanelEntry, el: HTMLElement): void {
		// Only a close is worth animating. A panel being *redrawn* (a reactive
		// dependency in its handler) replaces its element through here too, and that
		// one simply goes, so the new one isn't drawn over a ghost of the old.
		if (!entry.closing) { el.remove(); return; }
		el.classList.add("s-panel-closing");
		el.setAttribute("inert", "");
		const drop = () => {
			clearTimeout(timer);
			this.timers.delete(timer);
			el.remove();
		};
		el.addEventListener("transitionend", (e: TransitionEvent) => {
			if (e.target === el && e.propertyName === "opacity") drop();
		});
		const timer = setTimeout(drop, PAGE_MS + 80);
		this.timers.add(timer);
	}

	// ── Navigation ─────────────────────────────────────────────────────────

	/**
	 * The arrangement navigation works from: the one we're on the way to while a
	 * change is still settling, and the one on screen otherwise.
	 *
	 * Settling takes a moment more often than it looks: every `route.back()`
	 * travels through the browser's history and lands on a `popstate`, and an
	 * app-registered route guard may be async. Working from the committed
	 * arrangement in that window would make a second Escape aim at the panel the
	 * first one is already taking away — so two quick Escapes would peel one panel.
	 */
	private intended(): Arrangement {
		return this.intent ?? { stack: this.paths(), focus: this.$state.focus };
	}

	/** The history `state` describing `arr` — exactly what `targetFor` reads back. */
	private stateFor(arr: Arrangement): Record<string, any> {
		return {
			panels: arr.stack.slice(0, arr.focus),
			parked: arr.stack.slice(arr.focus + 1),
			pinned: this.pinnedPaths(),
		};
	}

	/** The paths of the pinned panels — the pin list history entries persist. */
	private pinnedPaths(): string[] {
		return this.$state.live.filter((e) => e.$panel.pinned).map((e) => e.path);
	}

	/**
	 * Put a navigation to the router, or — while one is still settling — behind
	 * the one that is. Only the newest waits: each was worked out against
	 * {@link intended}, so the newest is the one that means what the user last
	 * asked for, and the one it displaces resolves `false`.
	 *
	 * A refusal empties the queue instead of running it: a navigation can still
	 * fail to land — an app-registered route guard vetoes it, or another one
	 * supersedes it — and what was queued behind it was worked out against the
	 * arrangement it would have produced.
	 */
	private issue(target: Arrangement, run: () => boolean | Promise<boolean>): Promise<boolean> {
		this.intent = target;
		if (this.settling) {
			this.queued?.settle(false);
			return new Promise<boolean>((settle) => { this.queued = { run, settle }; });
		}
		return this.start(run);
	}

	private start(run: () => boolean | Promise<boolean>): Promise<boolean> {
		const done = (ok: boolean): boolean => {
			this.settling = null;
			const next = this.queued;
			this.queued = null;
			// The router applies a change (and runs Aberdeen's queue, so our own
			// commit has happened) before it settles us, which is what lets the next
			// one go straight out: it asks the guards of the panels it removes from
			// the stack as it stands now, not the one it was queued against.
			if (ok && next) this.start(next.run).then(next.settle, () => next.settle(false));
			else { this.intent = null; next?.settle(false); }
			return ok;
		};
		const settling = Promise.resolve(run()).then(done, (e) => { console.error(e); return done(false); });
		this.settling = settling;
		return settling;
	}

	/**
	 * Make the stack's `index`th panel current: the URL and the visible run move
	 * to it, while the panels right of it stay open, parked past the right edge
	 * of the viewport. Nothing closes; it is a history entry, so the browser's
	 * back button returns the focus to where it was. What a click on a
	 * breadcrumb — any link to an open panel — comes down to.
	 */
	private focusAt(index: number, search?: Record<string, string>, hash?: string): Promise<boolean> {
		const arr = this.intended();
		if (index < 0 || index >= arr.stack.length || index === arr.focus) return Promise.resolve(false);
		const target = { stack: arr.stack, focus: index };
		const path = arr.stack[index];
		return this.issue(target, () => {
			// The panel gets its own last search and hash back, unless the link
			// that brought us here carries its own.
			const entry = this.$state.live.find((e) => e.path === path);
			return route.go({ path, search: search ?? entry?.search, hash: hash ?? entry?.hash, state: this.stateFor(target) });
		});
	}

	/**
	 * One step back along the stack — what Escape does (`main()` calls this;
	 * it is not {@link PanelStack} API). At the stack's end this closes the
	 * current panel; mid-stack — with panels parked to the right — or when the
	 * panel holds {@link Panel.unsaved} work, the panel stays open and the
	 * focus just moves to the panel on its left, parking the one it leaves.
	 * Resolves `false` at the stack's start, where there is no left to go.
	 */
	back(): Promise<boolean> {
		return A.peek(() => {
			const arr = this.intended();
			if (arr.focus === arr.stack.length - 1 && !this.unsavedAt(arr.stack[arr.focus])) {
				return this.closePath(arr.stack[arr.focus] ?? "");
			}
			if (arr.focus === 0) return Promise.resolve(false);
			return this.focusAt(arr.focus - 1);
		});
	}

	/**
	 * Close whichever panel is open at `path`, current or not — what
	 * {@link Panel.close}, {@link PanelStack.closePanel} and the crumb menu's
	 * Close come down to. `false` when that path isn't open, is the stack's
	 * only panel, or holds {@link Panel.unsaved} work — nothing may close an
	 * unsaved panel; the app clears the flag first, which is its explicit
	 * "this is now discardable".
	 *
	 * Closing the current panel at the stack's very end pops back through the
	 * browser's history to the entry beneath it, when it is there (restoring its
	 * scroll and search state); the arrangement is part of the match, so an
	 * entry where the closing panel was merely parked won't do. Every other
	 * close is a *splice*: the columns around the closed one keep their place
	 * and state (the commit reconciles by path). That still gets its own
	 * history entry, so the browser's back button restores the closed column
	 * like any other arrangement — which is why it goes through `route.go` here
	 * rather than through `navigate()`, whose "link to an open panel" check
	 * would turn it into a focus move.
	 */
	private closePath(path: string): Promise<boolean> {
		return A.peek(() => {
			const arr = this.intended();
			const index = arr.stack.indexOf(normalizePath(path));
			if (index < 0 || arr.stack.length < 2 || this.unsavedAt(arr.stack[index])) return Promise.resolve(false);
			const stack = arr.stack.filter((_, i) => i !== index);
			// Closing the current panel hands the focus to the panel on its left (or,
			// at the stack's start, to the one that was parked beside it); closing
			// any other panel moves the focus not at all.
			const focus = index === arr.focus ? Math.max(0, index - 1) : arr.focus - (index < arr.focus ? 1 : 0);
			const target = { stack, focus };

			if (index === arr.focus && index === arr.stack.length - 1) {
				// When no history entry matches and the current one is replaced
				// instead, the panel beneath gets its stashed query back through the
				// fallback (a match restores the matched entry's own). Pins can't
				// ride the same way — a `state` in the fallback would be shadowed by
				// the match target's — so they are re-stamped onto whatever entry we
				// land on, the way `togglePin` writes them.
				const beneath = this.$state.live.find((e) => e.path === stack[focus]);
				const fallback: { search?: Record<string, string>; hash?: string } = {};
				if (beneath?.search) fallback.search = beneath.search;
				if (beneath?.hash) fallback.hash = beneath.hash;
				const pinned = stack.filter((p) => this.$state.live.find((e) => e.path === p)?.$panel.pinned === true);
				return this.issue(target, () =>
					Promise.resolve(route.back(
						{ path: stack[focus], state: { panels: stack.slice(0, focus), parked: [] } },
						fallback,
					)).then((ok) => {
						if (ok) route.current.state.pinned = pinned;
						return ok;
					}));
			}

			const current = stack[focus];
			const moved = current !== arr.stack[arr.focus];
			return this.issue(target, () => {
				// The current panel keeps its search params and hash: it isn't going
				// anywhere, and `go()` would otherwise default them away. When the
				// close *did* move the focus, the newly current panel gets its own back.
				const entry = moved ? this.$state.live.find((e) => e.path === current) : undefined;
				return route.go({
					path: current,
					search: moved ? entry?.search : { ...route.current.search },
					hash: moved ? entry?.hash : route.current.hash,
					state: this.stateFor(target),
				});
			});
		});
	}

	/**
	 * Navigate to `href`. `origin` is the path of the panel the link lives in, or
	 * `null` when it has none — a nav item, or a programmatic call, which builds
	 * the whole stack instead (see {@link deriveStack}). `replace` swaps the
	 * originating panel rather than stacking on top of it, and `beneath` says what
	 * the stack under the target is outright, for callers that know.
	 *
	 * Resolves the way every {@link PanelStack} method does: `true` once the
	 * navigation lands, `false` when it doesn't (already there counts as
	 * landed).
	 */
	private navigate(href: string, origin: string | null, replace = false, beneath?: readonly string[]): Promise<boolean> {
		return A.peek(() => {
			let url: URL;
			try { url = new URL(href, location.href); } catch { return Promise.resolve(false); }
			const path = normalizePath(url.pathname);
			const search = Object.fromEntries(new URLSearchParams(url.search));
			const hash = url.hash;
			const arr = this.intended();

			// A link to a panel that is already open is a return, not a navigation —
			// a stack never holds the same path twice. Returning just moves the
			// focus: the panels right of the target stay open, parked past the right
			// edge, and nothing closes. That is the whole behaviour of a breadcrumb,
			// which is exactly such a link.
			const open = beneath ? -1 : arr.stack.indexOf(path);
			if (open >= 0 && open !== arr.focus) {
				return this.focusAt(open, url.search ? search : undefined, hash || undefined);
			}
			if (open >= 0) {
				// The target is the panel we're already on. Going nowhere — but the link
				// may still carry a different search or hash, which belong to the
				// current panel: record that as a history entry, leaving the stack alone
				// (the panel reconciles by path, so it isn't even redrawn).
				if (url.search === location.search && (url.hash || "") === (location.hash || "")) return Promise.resolve(true);
				return this.issue(arr, () => route.go({ path, search, hash, state: this.stateFor(arr) }));
			}

			// A new panel: it opens at the stack's end and becomes current. The
			// panels after the origin close — except pinned ones, which ride along,
			// keeping their order, beneath the new panel (and unsaved ones, which
			// the commit itself keeps, parked — see `propose`). Without an
			// originating panel there is no stack to build on, so derive one — a
			// nav click and a deep link to the same URL land identically (bar the
			// pins, which a fresh tab doesn't have).
			const originIndex = origin == null ? -1 : arr.stack.indexOf(origin);
			// A stack never holds the same path twice (rendering reconciles by
			// path), so a caller-supplied `beneath` is deduplicated, not just
			// filtered against the target.
			const base = beneath
				? beneath.map(normalizePath).filter((p, i, all) => p !== path && all.indexOf(p) === i)
				: originIndex < 0
					? this.deriveStack(path).slice(0, -1)
					: arr.stack.slice(0, replace ? originIndex : originIndex + 1);
			// A replaced origin closes, pin or no pin: replacing is the panel's own
			// doing, not somewhere else navigating over it.
			const under = [...base, ...this.pinnedIn(arr.stack, [...base, path, replace ? origin : null])];
			const target = { stack: [...under, path], focus: under.length };
			return this.issue(target, () => route.go({ path, search, hash, state: this.stateFor(target) }));
		});
	}

	/** Programmatic push/replace, with the current panel as the implied origin. */
	private pushPath(path: string, replace: boolean): Promise<boolean> {
		return A.peek(() => {
			const arr = this.intended();
			return this.navigate(path, arr.stack[arr.focus] ?? null, replace);
		});
	}

	// ── Link interception ──────────────────────────────────────────────────

	/**
	 * Link handling through `route.interceptLinks()`, whose handler hook hands us
	 * the anchor so we can decide what the click *means*: the originating
	 * `.s-panel` (which decides what the click truncates), the `data-panel`
	 * attribute, and return-to-an-open-panel semantics. The exclusion rules
	 * (targets, downloads, modified clicks, external URLs) live in Aberdeen; the
	 * close guards run in `checkChange` when our navigation reaches the router.
	 *
	 * `data-panel` names which of the three {@link PanelStack} navigations the
	 * click is: `push` (the default), `replace`, or `open`, which drops the
	 * originating panel so the target arrives with its own stack beneath it,
	 * exactly as a nav item's link does. An unrecognised value is a `push`.
	 */
	private interceptLinks(): void {
		route.interceptLinks((url, anchor) => {
			const mode = anchor.getAttribute("data-panel");
			const panel = mode === "open" ? null : anchor.closest<HTMLElement>(".s-panel");
			const origin = panel ? this.$state.live.find((entry) => entry.el === panel) : undefined;
			void this.navigate(url.href, origin?.path ?? null, mode === "replace");
			return true;
		});
	}

	// ── What the shell's top bar asks ──────────────────────────────────────

	// The {@link PanelStack} face, where all the documentation lives. These are
	// the *queries* of the "queries subscribe, commands peek" rule on `$state`:
	// read one in a scope and that scope follows the stack's shape.

	get currentPanel(): Panel | undefined {
		return this.$state.live[this.$state.focus]?.$panel;
	}

	get panels(): readonly Panel[] {
		return this.$state.live.map((e) => e.$panel);
	}

	get currentPanelIndex(): number {
		return this.$state.focus;
	}

	pushPanel(path: string): Promise<boolean> {
		return this.pushPath(path, false);
	}

	replacePanel(path: string): Promise<boolean> {
		return this.pushPath(path, true);
	}

	openPanelStack(path: string, beneath?: readonly string[]): Promise<boolean> {
		return this.navigate(path, null, false, beneath);
	}

	closePanel(path?: string): Promise<boolean> {
		return A.peek(() => {
			const arr = this.intended();
			return this.closePath(path ?? arr.stack[arr.focus] ?? "");
		});
	}

	/**
	 * The breadcrumb stack, drawn by `main()` into the top bar: every open
	 * panel, oldest first, the ones on screen right now in bold, pinned ones
	 * wearing their pin. Every crumb but the current panel's is a plain link to
	 * that panel, and a link to an open panel is a focus move (see `navigate`) —
	 * so clicking along the stack closes nothing, in either direction, and the
	 * panels right of the current one wait just past the viewport's edge.
	 * Right-click (or long-press) offers pinning, and closing just that one
	 * panel — the close that splices it out of the middle when it isn't last.
	 */
	drawCrumbs(): void {
		// The very same row `S.tabs` puts its tab strip in: it scrolls when the
		// stack outgrows the bar, and shows a ‹ / › over whichever end still has
		// crumbs to reach — which a mouse can use, unlike a bare scroll area.
		scrollStrip({
			attrs: ".s-crumbs role=navigation aria-label=Breadcrumbs",
			content: () => {
				A(() => {
					const paths = this.panels.map((p) => p.path);
					const focus = this.currentPanelIndex;
					let currentEl: HTMLElement | undefined;
					for (let i = 0; i < paths.length; i++) {
						if (i) sepIcon({ size: "0.85em", attrs: ".s-crumb-sep" });
						const el = this.drawCrumb(paths[i], i, i === focus);
						if (i === focus) currentEl = el;
					}
					// Keep the panel you are on in view once this pass has been laid out.
					requestAnimationFrame(() => { if (currentEl) revealInStrip(currentEl); });
				});
			},
		});
	}

	private drawCrumb(path: string, index: number, current: boolean): HTMLElement {
		// Safe to close over: the crumb list is rebuilt whenever the stack (or
		// its focus) changes, so this entry is `paths[index]`'s for the crumb's
		// whole life.
		const entry = this.$state.live[index];
		// A real link, for the panel it names — so it has an address to hover, to
		// middle-click, to copy. No click handling of its own: the shell's link
		// handling already makes any link to an open panel the focus move a crumb
		// should be (see `navigate`). The panel you are on is a span: nowhere to go.
		return A(current ? "span.s-crumb aria-current=page" : "a.s-crumb", () => {
			if (!current) A("href=", path);
			// Bold = on screen right now, so the stack also says which of its panels
			// are the visible columns — not just which one is current.
			A(() => { if (entry?.$panel.visible) A(".s-crumb-on"); });
			// The ● of unsaved work — the mark that nothing can close this panel —
			// and the pin of a panel that navigation elsewhere won't close.
			A(() => { if (entry?.$panel.unsaved) dotIcon({ size: "0.45em", attrs: ".s-crumb-unsaved" }); });
			A(() => { if (entry?.$panel.pinned) pinIcon({ size: "0.85em", attrs: ".s-crumb-pin" }); });
			// `||`, not `??`: the root path's last segment is the empty string.
			A(() => { A("#", entry?.$panel.title ?? entry?.$ui.fallback ?? (path.split("/").pop() || path)); });
			// Taking over right-click means taking the browser's link menu away, so
			// the two entries anyone actually reaches for on a link come first,
			// where that menu would have had them, and the shell's own verbs sit
			// below the rule.
			addContextMenu({ items: [
				{
					// A real new tab, so it arrives cold and builds its own stack
					// from the path — exactly what the same link middle-clicked does.
					label: "Open in new tab",
					icon: newTabIcon,
					click: () => { window.open(path, "_blank", "noopener"); },
				},
				{
					label: "Copy link",
					icon: linkIcon,
					click: () => void copyLink(path),
				},
				{ separator: true },
				{
					label: () => { A(() => { A("#", entry?.$panel.pinned ? "Unpin" : "Pin"); }); },
					icon: () => { A(() => { (entry?.$panel.pinned ? pinOffIcon : pinIcon)(); }); },
					click: () => { if (entry) this.togglePin(entry); },
				},
				{
					label: "Close",
					icon: closeIcon,
					// Greyed out while the panel holds unsaved work: nothing may
					// close it (`closePath` would refuse anyway). Read here, in the
					// crumb's own scope, so the flag flipping redraws the crumb —
					// the ● above and this menu entry stay one truth.
					disabled: entry?.$panel.unsaved === true,
					click: () => void this.closePath(path),
				},
			] });
		}) as HTMLElement;
	}

	/**
	 * Flip a panel's pin (see {@link Panel.pinned}). The flag lives on the panel;
	 * the current history entry's snapshot is rewritten too, so a reload keeps
	 * the pin — a same-panel state tweak, which the router applies unguarded.
	 */
	private togglePin(entry: PanelEntry): void {
		entry.$panel.pinned = !entry.$panel.pinned || undefined;
		route.current.state.pinned = this.pinnedPaths();
	}

	// ── document.title ─────────────────────────────────────────────────────

	/**
	 * `"<panel title> · <app title>"`, kept in sync with the current panel — and
	 * prefixed `"• "` while *any* open panel holds unsaved work, the way editors
	 * mark a dirty document. Any panel, not just the current one: the risk of
	 * losing the work is tab-wide, so the mark on the tab is too.
	 */
	private watchTitle(): void {
		const original = document.title;
		A(() => {
			const entry = this.$state.live[this.$state.focus];
			const panelTitle = entry?.$panel.title ?? entry?.$ui.fallback;
			const appTitle = typeof this.opts.title === "string" ? this.opts.title : undefined;
			// Reading the stack re-runs this when its shape changes; each panel's
			// own `unsaved` (up to the first dirty one) does the rest.
			const dirty = this.$state.live.some((e) => e.$panel.unsaved);
			const title = panelTitle && appTitle ? `${panelTitle} · ${appTitle}` : panelTitle || appTitle;
			if (title) document.title = (dirty ? "• " : "") + title;
		});
		A.clean(() => { document.title = original; });
	}

	/**
	 * While any open panel holds unsaved work, closing the tab — or navigating
	 * the whole browser away — runs into the browser's own are-you-sure. When
	 * the user stays, the unsaved panel is brought back on screen if it wasn't,
	 * so what held the tab is in front of them rather than parked out of sight.
	 */
	private guardTabClose(): void {
		if (typeof window === "undefined") return;
		let leaving = false;
		const onHide = () => { leaving = true; };
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			// Being asked again means we weren't gone after all (a bfcache restore).
			leaving = false;
			const dirty = this.$state.live.find((entry) => entry.$panel.unsaved);
			if (!dirty) return;
			e.preventDefault();
			e.returnValue = true; // Chrome/Edge < 119
			// This task only ever amounts to anything if the user cancels: a
			// confirmed leave unloads the document (`pagehide`) first.
			const path = dirty.path;
			setTimeout(() => {
				if (leaving) return;
				const entry = this.$state.live.find((live) => live.path === path);
				if (entry && !entry.$panel.visible) void this.focusAt(this.intended().stack.indexOf(path));
			}, 0);
		};
		// Registered only while a panel actually holds unsaved work: a page with a
		// `beforeunload` listener is shut out of the browser's back/forward cache,
		// and that is a tax every navigation in the app would otherwise pay — for a
		// guard that almost never has anything to guard.
		A(() => {
			if (!this.$state.live.some((entry) => entry.$panel.unsaved)) return;
			window.addEventListener("beforeunload", onBeforeUnload);
			window.addEventListener("pagehide", onHide);
			A.clean(() => {
				window.removeEventListener("beforeunload", onBeforeUnload);
				window.removeEventListener("pagehide", onHide);
			});
		});
	}

	// ── Rendering ──────────────────────────────────────────────────────────

	/**
	 * Draw the column viewport into the current element. Called by `main()`.
	 *
	 * A column is the panel's own content, plus the one bit of chrome the shell
	 * places for it: its {@link Panel.actions}, in a strip on wide shells and in
	 * the top bar on narrow ones (see {@link drawActions}).
	 */
	drawColumns(): void {
		const container = A("div.s-panels role=main", () => {
			// Published before the first panel draws, rather than from the return
			// value below: a panel sizes itself from the shell's measurements (see
			// `measure`), and the first ones do that while this very call is still
			// running. `A()` without arguments is "the element we're in".
			this.containerEl = A() as HTMLElement;
			// Mounted and unmounted by path (see `$open`); a panel's DOM position
			// among its siblings is its creation order, which is all the layering
			// needs — `layout()` places and stacks the columns itself.
			A.onEach(
				this.$open,
				(entry) => this.drawPanel(entry),
				(entry) => entry.order,
			);
		}) as HTMLElement;

		if (typeof ResizeObserver !== "undefined") {
			const ro = new ResizeObserver(() => this.layout());
			// The region *and* the body it sits in: the region alone misses a shell
			// resize that the columns happen to absorb, which still re-resolves widths.
			ro.observe(container);
			const body = container.parentElement?.parentElement;
			if (body) ro.observe(body);
			A.clean(() => ro.disconnect());
		}
		A.clean(() => { if (this.containerEl === container) this.containerEl = undefined; });
		this.scheduleLayout();
	}

	private drawPanel(entry: PanelEntry): void {
		let el: HTMLElement | undefined;

		// How much room the panel wants, resolved *before* its content is drawn: an
		// element that arrives without a width has no box for its content to measure
		// itself against until the next frame's layout pass, which is a frame too
		// late for anything that sizes itself from its container. So the panel is
		// created at the width the window gives it — the "full" width until the panel
		// says otherwise. Reactively, too: a panel that changes its mind later (when
		// its data arrives, say) reflows in place rather than being redrawn, and the
		// columns beside it slide over to make room.
		A(() => {
			const asked = entry.$panel.maxWidth;
			entry.maxWidth = asked === "half" || asked === "screen" ? asked : "full";
			const width = this.roomFor(entry.maxWidth);
			if (!width) return;
			entry.width = width;
			// Published to the panel too, so a handler can read the box it is about
			// to draw into without measuring it.
			if (A.peek(entry.$panel, "width") !== width) entry.$panel.width = width;
			// The first run has no element to put it on yet — it's created with this
			// width, just below. Later runs are the panel changing its mind.
			if (!el) return;
			el.style.width = `${width}px`;
			this.scheduleLayout();
		});

		el = A(`section.s-panel${entry.width ? ` w:${entry.width}px` : ""}`, "destroy=", (node: HTMLElement) => this.playExit(entry, node), () => {
			// The actions strip, in its own scope: chrome may redraw freely — when
			// the panel changes its actions, when the shell crosses the narrow
			// threshold — but the body below never may.
			A(() => this.drawActions(entry));

			A("div.s-content", () => {
				entry.draw(entry.$panel);
				// After the content, so there is something to scroll when restoring.
				route.persistScroll(entry.path);
				// A panel that named itself is done; one that didn't lends its
				// first line of text (the DOM is already built — Aberdeen draws
				// synchronously) to the crumbs and document.title, so neither
				// ever goes blank. Peeked: a rename must not redraw the panel.
				if (A.peek(entry.$panel, "title") == null) {
					const text = firstText(A() as HTMLElement);
					if (text && A.peek(entry.$ui, "fallback") !== text) entry.$ui.fallback = text;
				}
			});

			// The loading hint, in its own scope so flipping the flag doesn't
			// redraw the panel's content. Held-back panels show nothing yet: they
			// are still parked off screen, waiting to slide in with real content.
			A(() => {
				if (!entry.$panel.loading || entry.$ui.holding) return;
				A("div.s-panel-loading aria-hidden=true", () => { A("i"); A("i"); A("i"); });
			});
		}) as HTMLElement;

		entry.el = el;
		// It has its width, but nothing animates from the arbitrary initial spot;
		// `layout()` gives the panel its place in the run (and turns transitions
		// back on) in the upcoming frame, before anything is painted. A redraw (a
		// reactive dependency inside the handler) lands here too, with a brand-new
		// element that has to be placed again before it may animate.
		entry.placed = false;
		el.style.transition = "none";
		A.clean(() => { if (entry.el === el) entry.el = undefined; });

		// A held-back panel that finishes loading gets to play its enter animation.
		A(() => {
			void entry.$panel.loading;
			this.scheduleLayout();
		});

		this.scheduleLayout();
	}

	/**
	 * The one bit of column chrome the shell draws: the panel's actions, in a
	 * quiet strip above the scroll area — and only while the shell is wide, the
	 * top bar carrying them otherwise. Everything else in a column is the panel's
	 * own content: a screen that wants a heading or a card draws them itself.
	 * Going back isn't here either — that is the breadcrumbs' job, in the bar.
	 */
	private drawActions(entry: PanelEntry): void {
		if (this.opts.$shell.narrow || entry.$panel.actions == null) return;
		A("div.s-panel-actions", () => drawSlot(entry.$panel.actions));
	}

	// ── Layout engine ──────────────────────────────────────────────────────

	scheduleLayout(): void {
		if (this.layoutQueued) return;
		this.layoutQueued = true;
		requestAnimationFrame(() => {
			this.layoutQueued = false;
			this.layout();
		});
	}

	/**
	 * Measure the shell, and with it the width the window gives a panel of each
	 * layout. Measured on the *shell*, not on the column region: the region's width
	 * is the layout engine's own output, so reading it back would nail the layout
	 * to whatever it happened to be a frame ago. Fractional widths throughout — a
	 * rounded column edge would drift a pixel away from the chrome above it.
	 *
	 * `undefined` while the shell has no width to speak of (it isn't in a document
	 * yet, or it's `display:none`); the next pass tries again.
	 */
	private measure(): Geometry | undefined {
		const container = this.containerEl;
		const inner = container?.parentElement;
		const body = inner?.parentElement;
		if (!container || !inner || !body) return undefined;
		const total = body.getBoundingClientRect().width;
		if (!total) return undefined;

		// Everything that sits beside the columns: the sidebar and its hairline,
		// either of which may be display:none on a narrow shell.
		let chrome = 0;
		for (const child of inner.children) {
			if (child !== container) chrome += child.getBoundingClientRect().width;
		}

		// The standard panel is SHELL_PX wide, capped by the window; what it leaves
		// beside the sidebar is the *standard* content area. Widths are a pure
		// function of the window — never of what else is open — so a panel NEVER
		// resizes because a neighbour came or went; only a window resize (the
		// snap pass in `layout`) changes them:
		// - "full" fills the standard content area exactly;
		// - "half" is half of it whenever that half is still a usable column, and
		//   the whole of it on narrower screens;
		// - "screen" ignores the standard width and takes everything the window
		//   has — which also means nothing ever fits beside it.
		const full = Math.max(0, Math.min(SHELL_PX, total) - chrome);
		const halved = full / 2;
		return {
			total,
			chrome,
			half: halved >= PAIR_MIN_PX ? halved : full,
			full,
			screen: Math.max(0, total - chrome),
		};
	}

	/**
	 * The measurements this pass runs on. Taken once per layout pass and per
	 * commit, and shared with the panels drawn in between — they all size
	 * themselves against the same shell, and a `getBoundingClientRect()` each
	 * would be a forced reflow each, in the middle of building their DOM.
	 */
	private geometry(): Geometry | undefined {
		return (this.geom ??= this.measure());
	}

	/** How wide a panel asking for this is, right now; 0 while the shell can't be measured. */
	private roomFor(maxWidth: PanelEntry["maxWidth"]): number {
		return this.geometry()?.[maxWidth] ?? 0;
	}

	/**
	 * Size and position every panel, and publish the width of the whole ensemble
	 * (sidebar + separator + columns) for the shell to centre itself on.
	 *
	 * This is everything CSS can't work out for itself: which panels exist, which
	 * of them are visible, how wide each one is and where it sits. All the motion
	 * between two of these arrangements is CSS's job.
	 */
	private layout(): void {
		const container = this.containerEl;
		const shell = container?.closest<HTMLElement>(".s-main");
		if (!container || !shell) return;
		// This pass always runs from a fresh frame (rAF, a ResizeObserver) — no
		// reactive scope is active, so the stack and the panels are read plainly:
		// nothing here can subscribe to anything.
		const live = this.$state.live;
		const n = live.length;
		// A panel that hasn't drawn yet has no width to contribute, which would make
		// this pass's arithmetic (and any enter animation it triggers) meaningless.
		// Every mount schedules another pass, so simply wait for it.
		if (!n || live.some((entry) => !entry.el)) return;

		// This pass measures afresh — it is the one thing that runs after a resize.
		this.geom = undefined;
		const geom = this.geometry();
		if (!geom) return;

		const stacking = this.opts.stacking !== false;

		// A window resize (or the very first pass) must be adopted instantly —
		// geometry tracking the window through a 450ms transition reads as lag,
		// and a shell animating itself into place on load reads as a glitch.
		// `.s-shell-snap` suppresses every standing transition for this one pass.
		const snap = this.lastBodyW !== geom.total;
		if (snap) {
			this.lastBodyW = geom.total;
			shell.classList.add("s-shell-snap");
		}

		const width = (entry: PanelEntry) => geom[entry.maxWidth];

		// The visible run: as many columns as the window fits, at the sizes the
		// window gives them, ending at the current panel — which always shows.
		// Panels beyond it are parked past the right edge (see phase 1).
		const cur = Math.min(this.$state.focus, n - 1);
		let first = cur;
		let runSum = width(live[cur]);
		if (stacking) {
			for (let i = cur - 1; i >= 0; i--) {
				const sum = runSum + width(live[i]);
				if (sum > geom.screen) break;
				runSum = sum;
				first = i;
			}
		}

		// The content area holds the run, but is never smaller than the standard
		// panel (a lone small leaves its other half open — which is exactly where
		// the next small lands, without anything on screen moving) and never
		// wider than the window. So the panel is the familiar 1280px until extra
		// columns genuinely fit, and stretches — centred — to hold the ones that
		// do; with a "screen" up that's the window's edges.
		const area = Math.min(geom.screen, Math.max(geom.full, runSum));

		for (let i = first; i <= cur; i++) live[i].width = width(live[i]);
		// Panels that have never been visible get their would-be width too, so a
		// reveal doesn't start from nothing.
		for (const entry of live) {
			if (!entry.width) entry.width = width(entry);
		}

		// The chrome above and below the body caps itself to the ensemble width,
		// keeping everything centred and aligned however far the area stretches.
		// The consumers transition their max-width (see main.ts), so the
		// recentring plays along with the panel that caused it instead of
		// snapping.
		shell.style.setProperty("--s-shell-w", `${geom.chrome + area}px`);

		// Phase 1 — every panel's *start* state for this frame. Panels already on
		// screen simply move (their standing transition animates it); freshly
		// mounted ones still have transitions switched off, so what we set here is
		// adopted instantly and becomes the "before" of their enter animation.
		const fresh: PanelEntry[] = [];
		let x = 0;
		for (let i = 0; i < n; i++) {
			const entry = live[i];
			const el = entry.el!;
			const shown = i >= first && i <= cur;
			// Visible columns tile the content area, left to right. Panels crowded
			// out from under the run rest at its left edge; panels beyond the
			// current panel park just past its right edge — both keep their last
			// width. Deeper panels layer over shallower ones, each on the odd
			// layer for its depth (see LAYER_STEP).
			place(el, shown ? x : i > cur ? area : 0, entry.width, LAYER_STEP * i + 1);
			// What `$panel.visible` and `$panel.width` report: this pass is the one
			// thing that knows them, window resizes included. Written only on a
			// change, so per-panel UI hanging off them isn't rebuilt by every pass.
			if (entry.$panel.visible !== shown) entry.$panel.visible = shown;
			if (entry.$panel.width !== entry.width) entry.$panel.width = entry.width;
			if (shown) x += entry.width;
			el.classList.toggle("s-panel-sep", shown && i > first);
			// Off-screen panels fade out over the edge they park at and, once
			// faded, stop being rendered at all — but they keep their DOM, and
			// their scroll position.
			el.classList.toggle("s-panel-hidden", i < first);
			el.classList.toggle("s-panel-parked", i > cur);
			el.toggleAttribute("inert", !shown);
			if (entry.placed) continue;
			fresh.push(entry);
			// A panel that mounts while still fetching holds here for a moment, so
			// it can enter with real content instead of an empty column.
			if (!entry.$panel.loading || entry.holdDone) entry.$ui.holding = false;
			else if (!entry.$ui.holding) { entry.$ui.holding = true; this.holdEnter(entry); }
			// Already at its resting place; the enter animation is the offset (and
			// the transparency) it starts from, one edge to the right.
			if (entry.enter && shown) el.classList.add("s-panel-enter");
		}

		// Phase 2 — force the browser to adopt those start states (and, on a snap
		// pass, the transition-free geometry) as the ones to animate *from*.
		// (Reading a layout property is what does it.)
		if (fresh.length || snap) void container.offsetWidth;
		if (snap) shell.classList.remove("s-shell-snap");
		// Phase 3 — transitions back on, start state dropped, and off they go.
		for (const entry of fresh) {
			if (entry.$ui.holding) continue;
			entry.el!.style.transition = "";
			entry.el!.classList.remove("s-panel-enter");
			entry.enter = false;
			entry.placed = true;
		}
	}

	/** Let a `loading` panel's enter animation wait — but not indefinitely. */
	private holdEnter(entry: PanelEntry): void {
		const timer = setTimeout(() => {
			this.timers.delete(timer);
			entry.holdDone = true;
			if (entry.$ui.holding) {
				entry.$ui.holding = false;
				this.scheduleLayout();
			}
		}, LOADING_HOLD_MS);
		this.timers.add(timer);
	}
}

/** Put a panel at rest: `x` from the region's left edge, `width` pixels wide, on layer `z`. */
function place(el: HTMLElement, x: number, width: number, z: number): void {
	el.style.left = `${x}px`;
	el.style.width = `${width}px`;
	el.style.zIndex = String(z);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sameStack(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * The first non-empty text inside `el`, trimmed and capped at a name-like
 * length — the stand-in title for a panel that never set one.
 */
function firstText(el: HTMLElement): string | undefined {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		const t = n.textContent!.trim();
		if (t) return t.length > 48 ? `${t.slice(0, 47).trimEnd()}…` : t;
	}
}

/**
 * Put a panel's address on the clipboard, as the absolute URL someone can paste
 * anywhere — which is what the browser's own "Copy link" would have given them.
 * Confirmed with a toast, since a silent copy leaves you wondering; `writeText`
 * needs a secure context, so a failure says so rather than lying.
 */
async function copyLink(path: string): Promise<void> {
	const url = new URL(path, location.href).href;
	try {
		await navigator.clipboard.writeText(url);
		toast({ message: "Link copied." });
	} catch {
		toast({ message: "Couldn't copy the link.", type: "danger" });
	}
}

function drawDefaultNotFound($panel: Panel<{}>): void {
	A("p fg:$s-muted", () => A("#", `No panel at ${$panel.path}`));
}

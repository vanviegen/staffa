import A, { OPAQUE } from "aberdeen";
import * as route from "aberdeen/route";
import { type Slot, drawSlot } from "../core.js";
import {
	circle as dotIcon, pin as pinIcon, pinOff as pinOffIcon,
	slash as sepIcon, x as closeIcon,
} from "../icons.js";
import { PANEL_SHEEN } from "../theme.js";
import { addContextMenu } from "./menu.js";
import { scrollStrip, revealInStrip } from "./tabs.js";

/**
 * Routed, multi-column panel navigation for {@link main}.
 *
 * Each route draws one screen, called a *panel*. The open panels form a
 * **stack** whose last panel is the **current** one: the panel the URL names,
 * and the rightmost column on screen. As many as fit are shown, ending there.
 *
 * A navigation's target becomes the top of the stack, and the same path is
 * never in it twice: opening a panel closes everything after the one it came
 * from, while a plain link to an already-open panel returns to its place. Two
 * kinds survive that — pinned panels, which ride along, and unsaved ones, which
 * nothing tears down. Both wait parked past the rightmost column, the only way
 * a panel ever sits *after* the current one.
 *
 * Navigation runs through `aberdeen/route`: the URL holds the current panel and
 * the rest of the arrangement is stored beside it in the history entry, so back
 * and forward step through whole arrangements of columns.
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
 * How wide a panel asks to be — a ceiling the shell never exceeds; see
 * {@link Panel.maxWidth}. `"small"` is the column the content area is divided
 * into; `"medium"` and `"large"` are two and three of those, and `"none"` is
 * the whole area. Each is capped at the content area, so on a narrow window
 * they all come to the same thing.
 */
export type PanelSize = "small" | "medium" | "large" | "none";

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
	 *
	 * Single-segment params are percent-decoded; `[...x]` is not, since decoding
	 * it would make an encoded slash indistinguishable from a separator. Split it
	 * yourself: `x.split("/").map(decodeURIComponent)`.
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
	 * The widest this panel can usefully be — a ceiling the shell never
	 * exceeds, so the draw function never has to look right past it. It is
	 * counted in the shell's *columns*: the content area divides into the
	 * fewest whole number of columns of at most 540px each (two columns of 540
	 * in a 1080px area, three of ~507 in 1520px), and a column is never
	 * narrower than 360 — where the area holds just one, a small centres in it
	 * rather than stretching. So an ask never exceeds its column count × 540:
	 *
	 * - `"small"` — one column, never above 540px: lists, detail forms.
	 * - `"medium"` (the default) — two columns, never above 1080px.
	 * - `"large"` — three columns, never above 1620px: wide tables.
	 * - `"none"` — the whole content area, unbounded: boards, dashboards.
	 *   Bound it with the shell's own `maxWidth` where that matters.
	 *
	 * Every size is capped at the content area, so on a phone they all come to
	 * the same thing: one screen at a time. And a width depends only on the
	 * window, never on what else is open, so opening or closing a panel never
	 * resizes another — the run of columns just shifts over in the area.
	 *
	 * The ask is a ceiling only; there is no matching floor, since the window can
	 * be any width. Aim your layout at 360px — about the narrowest phone still in
	 * common use — and let it degrade gracefully below that.
	 *
	 * Ask only for what your content can actually use: a panel that would cap
	 * its own content narrower than its ask is holding room that would have
	 * let another column fit beside it.
	 *
	 * Set it at the top of your handler and the panel is already that wide when
	 * you draw (see {@link Panel.width}); set it later — when your data tells you
	 * — and the panel reflows without being redrawn, keeping its state, while
	 * the columns beside it move over.
	 */
	maxWidth?: PanelSize;
	/**
	 * Set this while you're fetching what the panel needs, and back to `false`
	 * when you're done. A new panel slides into place right away but waits a
	 * moment before fading in, so it can appear with real content instead of
	 * empty; if the wait drags on it fades in anyway and shows a loading
	 * indicator until the flag clears. It only affects the animation; the
	 * stack and the URL never wait for it.
	 */
	loading?: boolean;
	/**
	 * Keeps this panel from being closed by navigation happening *elsewhere*.
	 * A navigation normally closes everything after the panel it came from (or
	 * returned to); a pinned panel survives that, staying in the stack — slotted
	 * in beneath the new panel, or parked out of sight when the new panel was
	 * already beneath it. Either way it is one crumb click away. The user toggles it from the crumb's context menu
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
	 * navigation that would prune it parks it out of sight instead, wearing a
	 * ● in its crumb — even the browser's back button only parks it. {@link Panel.close} and the crumb menu's Close refuse,
	 * Escape on it steps left along the stack rather than closing, and closing
	 * the browser tab runs into the browser's own are-you-sure, the unsaved
	 * panel brought on screen as the question is raised.
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
	/**
	 * Opens `href` exactly as a click on a link inside this panel does — the
	 * shell's own link handling runs through this very call, so the two can't
	 * drift apart. By default that is a push: the target opens on top of this
	 * panel, closing the panels after it first (pinned ones ride along
	 * beneath the new panel, unsaved ones park), and a path that is already
	 * open is returned to rather than opened twice. `how` plays the part of a
	 * link's `data-panel` attribute: `"replace"` puts the target in this
	 * panel's place — history entry included, so the back button skips the
	 * replaced panel — `"open"` leaves the panel behind and gives the target
	 * its own stack, and omitting it follows the shell's
	 * {@link MainOptions.linkNavigation}, like a link without the attribute.
	 *
	 * This is the one for navigation that can't be a link: a row's click
	 * handler, a keyboard shortcut acting on this screen. The stack's
	 * {@link PanelStack.pushPanel} builds on the *current* panel instead — a
	 * different panel exactly when the interaction happened in a column
	 * beside it, where it would pile the new panel on top of the open detail
	 * rather than pruning back to this one.
	 *
	 * @example
	 * ```ts
	 * A("div.row click=", () => void $panel.open(`/contacts/${id}`), ...);
	 * ```
	 */
	open(href: string, how?: "push" | "replace" | "open"): Promise<boolean>;
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
 * sideways `left` moves, the narrow-screen nav slide. Published below as the
 * `--s-panel-ms` custom property, so CSS and JS can't drift apart.
 */
const PAGE_MS = 250;
/** How long a freshly pushed `loading` panel holds its fade-in. */
const LOADING_HOLD_MS = 300;
/**
 * The bounds of a column: at most 540px — the width columns aim for, the area
 * dividing into the fewest of them that stay within it — and at least 360px,
 * about the narrowest phone in common use, so where a panel's layout is aimed.
 */
const SMALL_MIN_PX = 360;
export const SMALL_MAX_PX = 540;

// ─── Module-level styling ────────────────────────────────────────────────────

A.insertGlobalCss({
	":root": `--s-panel-ms:${PAGE_MS}ms`,
	// The clipping viewport the columns slide through; panels are absolutely
	// positioned inside it, sized and offset from JS (see `layout()`).
	// `isolation` keeps their z-index layers below the shell's own chrome. It
	// paints the same PANEL_SHEEN as every panel, so columns and the ground
	// beside them read as one surface.
	// `overflow:clip`, not `hidden`: a hidden box is still a scroll container,
	// and anything that scrolls it (find-in-page, an in-page anchor) shifts every
	// column sideways permanently, with nothing to scroll it back.
	".s-panels":
		"flex:1 min-width:0 min-height:0 position:relative overflow:clip isolation:isolate " +
		PANEL_SHEEN,
	".s-panel": {
		// The shell knows three motions, and this vocabulary is all of them:
		// a panel that MOVES animates its `left` — every mover in a pass shares
		// this one duration and ease-out, so panels travelling the same distance
		// travel as one — a CREATED panel joins the strip beside the old position
		// of the panels beneath it and rides their slide while fading in, and a
		// CLOSED one fades out where it stood. Nothing else ever animates.
		// A plain `left`, never a transform: a transformed element is
		// composited, costing it subpixel text antialiasing. No `width`
		// transition either — animating one reflows the column every frame. And
		// the fade is `linear` while the moves ease out: an eased opacity spends
		// its last stretch near zero, reading as a vanish.
		// Layering is fixed per state, not per stack depth: live panels never
		// overlap each other (the strip keeps them adjacent, see `layout()`), so
		// only the fading ones need an order — below, in both directions, per
		// the classes underneath.
		// PANEL_SHEEN gives every panel an opaque ground (panels animate over one
		// another, and two transparent ones mean text sliding over text).
		"&":
			"position:absolute top:0 bottom:0 left:0 display:flex flex-direction:column " +
			PANEL_SHEEN + " " +
			"z-index:2 transition: left var(--s-panel-ms) ease-out, opacity var(--s-panel-ms) linear;",
		// The hairline between two columns, fading at both ends (like the sidebar's
		// `.s-nav-sep`). Columns tile with no gutter — each brings its own `$3` of
		// padding — so this sits exactly on the boundary.
		"&.s-panel-sep::before":
			"content:'' position:absolute left:0 top:0.6rem bottom:0.6rem width:1px z-index:1 " +
			"background: linear-gradient(to bottom, transparent, $s-faint 18%, $s-faint 82%, transparent);",
		// Still owed or playing its entry fade: beneath the settled panels, so
		// whatever slides across its spot passes over it. Dropped once the fade
		// is over (see `releaseEnter`).
		"&.s-panel-new": "z-index:1",
		// On its way out: it fades where it stood, beneath every live panel
		// (declared after `.s-panel-new`, so closing mid-enter drops a panel to
		// the bottom), and leaves the DOM when the fade ends (see `playExit`).
		"&.s-panel-closing": "z-index:0 opacity:0 pointer-events:none",
		// The fade-in's start state: a newcomer wears it from creation until its
		// content is ready — usually the very pass that placed it, later for a
		// `loading` panel holding out for data — sliding invisibly meanwhile.
		// Dropping the class is what starts the fade (see `releaseEnter`).
		"&.s-panel-enter": "opacity:0",
		// Off screen but open: the strip simply continues past the viewport's
		// edges, so these rest at their true positions, clipped — being crowded
		// out or revealed is an ordinary move, not a fade. Both keep their DOM —
		// and so their scroll position and half-typed forms — hence
		// `visibility`, not `display:none`: it holds through the move out
		// (flipping only at its end) and lifts instantly on the move back in
		// (the base transition above doesn't list it).
		"&.s-panel-hidden, &.s-panel-parked":
			"visibility:hidden " +
			"transition: left var(--s-panel-ms) ease-out, opacity var(--s-panel-ms) linear, visibility var(--s-panel-ms);",
	},
	// The scroll container, with the column's own padding. Its scrollbar sits
	// flush against the column edge (unlike content mode's inset one), so it meets
	// the next column's hairline with no strip of nothing between.
	".s-panel > .s-content": "flex:1 min-height:0 overflow-y:auto overflow-x:hidden p:$3",
	// A panel's actions on a wide shell: a quiet strip at the column's top-right,
	// above the scroll area (never sticky inside it). On a narrow shell the top
	// bar carries them instead, and no strip is drawn at all.
	".s-panel-actions": "display:flex align-items:center justify-content:flex-end gap:$1 flex-shrink:0 padding: $3 $3 0;",
	// The breadcrumb stack the top bar shows: every open panel, oldest first, the
	// ones on screen in bold ink (see `drawCrumbs`). It is a `.s-strip` (see
	// tabs.ts), so scrolling and the ‹ / › come with it; only the gap is left.
	".s-crumbs > .s-strip-row": "gap:$m1",
	".s-crumb": {
		// Quiet ink for the stack, full ink and weight for the panels on screen.
		// No padding of its own: the first crumb must start on the same pixel as
		// the app's name above it. The flex shares out a tight row — every crumb
		// grows from a 4rem basis and freezes at its own text, so the longest give
		// way first. `flex-shrink:0` is what stops them ellipsising into a row of
		// stubs: past that point the row overflows and the strip scrolls instead.
		"&":
			"flex: 1 0 4rem; font-size:0.85em line-height:1.5 fg:$s-muted text-decoration:none " +
			"white-space:nowrap max-width:max-content overflow:hidden text-overflow:ellipsis " +
			"transition: color 0.12s;",
		"&.s-crumb-on": "font-weight:600 fg:$s-text",
		// The same hover treatment as a menu item. The panel you are on is a plain
		// span rather than a link, so it needs no `:not()` guard here.
		"a&:hover": "filter:none color: color-mix(in lab, $s-primary 33%, $s-text);",
		// The pin of a pinned panel, inline before its title. Filled, because at
		// crumb size the icon's hairline strokes alias into a wobble.
		"svg.s-crumb-pin": "vertical-align:-0.12em margin-right:0.3em opacity:0.8 fill:currentColor",
		// The ● of a panel holding unsaved work — the editors' dirty mark, filled
		// solid for the same reason as the pin.
		"svg.s-crumb-unsaved": "vertical-align:0.08em margin-right:0.3em fill:currentColor",
	},
	// A slash, not a chevron: the stack is a path, and a chevron would be
	// confusable with the strip's own ‹ / › scroll buttons (see tabs.ts).
	"svg.s-crumb-sep": "flex-shrink:0 opacity:0.4",
	// A resize (and the first pass) must track the window instantly rather than
	// rubber-band behind it: the layout engine raises this class, applies the new
	// geometry, and drops it after a forced reflow.
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
 * A {@link Panel} as the controller holds it: the handler's own object, minus
 * the `readonly`s — `width` and `visible` are read-only to the app only; the
 * shell writes them, which is what makes reading them reactive.
 */
type PanelState = { -readonly [K in keyof Panel<any>]: Panel<any>[K] };

interface PanelEntry {
	/**
	 * Opaque to Aberdeen: without it, reading an entry back out of the reactive
	 * `$state`/`$open` collections would wrap the whole thing — DOM element and
	 * draw function included — in a proxy. Its reactive faces are `$panel`/`$ui`.
	 */
	readonly [OPAQUE]: true;
	/**
	 * The DOM sort key: one shared counter, so panels sit in creation order.
	 * Never updated — rewriting it would make Aberdeen redraw the panel, losing
	 * the scroll position and half-typed forms. DOM order therefore drifts from
	 * stack order once panels are spliced out of sequence; invisible beyond tab
	 * order, since panels are absolutely positioned.
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
		 * set none. Kept beside `$panel.title` rather than written into it, so the
		 * app's field only holds what the app wrote and a body redraw can refresh
		 * the borrowed text.
		 */
		fallback?: string;
	};
	el?: HTMLElement;
	/**
	 * The search params and hash from while this panel was last current, stashed
	 * when the focus moves off it and restored when it becomes current again.
	 * Search and hash belong to the current panel only, so this is the one place
	 * they survive a visit elsewhere along the stack.
	 */
	search?: Record<string, string>;
	hash?: string;
	/** Set once the panel is on its way out, playing its exit animation. */
	closing?: boolean;
	/** Set while the fade-in is still owed (a `loading` hold can owe it past placement). */
	enter?: boolean;
	/** Whether the panel has been through a full layout pass (and so may animate). */
	placed?: boolean;
	/** Whether its `loading` hold has already expired, so it can't hold again. */
	holdDone?: boolean;
	/** What the panel asks for, kept in step with its `$panel.maxWidth`. */
	maxWidth: PanelSize;
	/**
	 * The width it was last laid out at, set before the content is first drawn so
	 * that content has a real box to measure against. Visible panels get a fresh
	 * value every pass; hidden and closing ones keep this, so nothing invisible
	 * ever reflows.
	 */
	width: number;
}

/**
 * What the shell measures out to, and with it every panel size. A pure function
 * of the content area, so a panel never resizes because a neighbour came or went.
 */
interface Geometry {
	/** The content area: all the room the columns have between them. */
	area: number;
	/** What each {@link PanelSize} comes to in that area. */
	size: Record<PanelSize, number>;
}

/**
 * One state of the stack: the open paths, oldest first, and which is current.
 * Panels before `focus` sit to its left; those after it are parked out of sight,
 * having refused to close — the only way anything ends up there. This is what a
 * history entry describes, and what every navigation is expressed as a change to.
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
	/** How many panels are shown at a time. See {@link MainOptions.columns}. */
	columns?: "auto" | "single";
	/** What a bare link does. See {@link MainOptions.linkNavigation}. */
	linkNavigation?: "push" | "replace" | "open";
	/** The shell's own title, used as the suffix of `document.title`. */
	title?: unknown;
	/**
	 * The shell's live narrow flag (see `main()`), deciding whether a panel's
	 * chrome sits in its own column or is promoted into the top bar. Shared
	 * rather than measured again, so the two can't disagree about the regime.
	 */
	$shell: { narrow: boolean };
}

/**
 * The URL is global, so two routed shells would fight over it; this only guards
 * against that. The stack itself is reached through `main()`'s return value.
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
	 * returns to it — closing whatever was stacked on top — rather than opening
	 * it twice, and a panel holding {@link Panel.unsaved} work is never closed,
	 * only parked. That's what a plain link does, and what `data-panel=push`
	 * says outright.
	 *
	 * Note that a link builds on the panel it is *drawn in*, which is the
	 * current panel only while no column beside it has the focus. Code
	 * navigating on behalf of a particular screen — a row's click handler —
	 * wants that panel's own {@link Panel.open} instead.
	 */
	pushPanel(path: string): Promise<boolean>;
	/**
	 * Opens `path` in place of the current panel, which closes. The panels
	 * beneath it stay as they are. The history entry is replaced too — a
	 * redirect, so the back button skips the replaced panel. That's what a
	 * `data-panel=replace` link does.
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
	 * Kept out of Aberdeen's proxy wrapping: a class instance holding DOM nodes,
	 * timers and route handlers, riding inside every {@link Panel.stack}. Its
	 * reactivity comes from `$state` and the panels, which are proxies already.
	 */
	readonly [OPAQUE] = true;
	private compiled: CompiledRoute[];
	/** The `ancestors` table, compiled like the routes it is keyed by. */
	private ancestors: { key: string; segs: Seg[]; fn: AncestorsHandler }[];
	private opts: PanelStackOptions;
	/**
	 * The live stack, oldest first (closing panels have left it), and which panel
	 * is current — the one reactive fact about the stack's *shape*. Each commit
	 * publishes the next shape by assigning a fresh `live` array; the entries are
	 * opaque, so a panel renaming itself doesn't redraw the stack.
	 *
	 * The invariant that makes this safe to touch from anywhere: **queries
	 * subscribe, commands peek**. Every navigation entry point (`navigate`,
	 * `closePath`, `back`, …) wraps itself in `A.peek`, so an app calling one
	 * from a reactive scope can't subscribe that scope to the stack it is
	 * changing; `propose` and `commit` inherit that and read the stack plainly.
	 */
	private $state = A.proxy({ live: [] as PanelEntry[], focus: 0 });
	/**
	 * The open panels again, keyed by path — the shape the DOM consumes.
	 * `drawColumns`' `onEach` mounts by key, so splicing a panel out of the
	 * middle touches exactly one key and the retained columns keep their scroll
	 * positions and half-typed forms. (Iterating `live` would key by array index,
	 * which a splice renumbers, redrawing every panel after it.)
	 */
	private $open = A.proxy<Record<string, PanelEntry>>({});
	/** Feeds {@link PanelEntry.order}: one shared counter, so keys never tie. */
	private nextOrder = 0;
	private containerEl?: HTMLElement;
	/** The shell's measurements, shared by everything drawn since they were taken. */
	private geom?: Geometry;
	/** The measurements the last layout ran on; a change in them → snap. */
	private lastGeom?: Geometry;
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

		// Commit the stack whenever the URL or its snapshot changes — initial load,
		// our own navigations, browser back/forward. The shell registers no route
		// guard of its own (closes are refused in `closePath` or repaired in
		// `propose`), so an app's `route.setGuard` keeps working untouched.
		A(() => {
			const target = this.computeTarget();
			// Subscribed, not peeked: a search/hash change with the path staying put
			// must refresh `lastSeen` too, or the next stash restores stale ones.
			const search = { ...route.current.search };
			const hash = route.current.hash;
			A.peek(() => {
				// Stash the query of the panel the URL just left, for when a crumb
				// brings it back (see PanelEntry.search). Here on the shared pipeline,
				// so our navigations, `route.go()` and back/forward are all covered.
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
				// A history entry describing no arrangement (initial load, an app's own
				// `route.go()`) is stamped with the one it just produced, so a reload
				// restores the same columns and `route.back()` can recognize the entry
				// — its matching wants the `panels`/`parked` keys actually present.
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
			// Answer whatever was waiting its turn, rather than leave it hanging.
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
	 * `route.go()` — anything with no panel to build on and no snapshot to
	 * restore. {@link PanelStackOptions.ancestors} gets first say; failing that,
	 * every prefix of the path is probed against the route table. A path with no
	 * route is skipped rather than opened as a "not found" column, so not routing
	 * a screen keeps it from appearing under another. The path itself always ends
	 * the derived stack, matched or not.
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
	 * Ask the `ancestors` table what belongs beneath `path`. The first matching
	 * key answers, with its own matched params; `undefined` means "no opinion",
	 * leaving the path to the prefix derivation as an unlisted one would be.
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
	 * The arrangement a route implies: its snapshot around its path, or — without
	 * one — derived, the new panel current at the end with pinned panels beneath.
	 *
	 * The snapshot reads subscribe (they are the URL's). The derivation is peeked:
	 * it reads the live stack for its pins, which the route observer rewrites, so
	 * subscribing would re-run that observer once per commit.
	 */
	private targetFor(path: string, state: Record<string, any>): Arrangement {
		const before = Array.isArray(state?.panels) ? state.panels.map(String) : null;
		if (before) {
			const after = Array.isArray(state.parked) ? state.parked.map(String) : [];
			// A stack never holds the same path twice: rendering reconciles by path,
			// so a duplicate leaves a permanently element-less entry that stalls the
			// layout. `route.go` accepts hand-written states, so drop rather than wedge.
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
	 * Adopt an arrangement proposed by the URL, after repairing it: a panel holding
	 * unsaved work is never torn down by any navigation — including a back to an
	 * entry from before it existed — so whatever the target drops, it stays, parked
	 * after the current panel. Parked panels are deliberately kept out of history
	 * entries: the work they protect lives in DOM a reload clears anyway.
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
	 * Reconciliation is BY PATH, not by index: a panel in both stacks stays mounted
	 * even if its index shifted, which is what lets one be spliced out of the middle
	 * without disturbing the columns above it. A common-prefix diff would remount
	 * them all, throwing away their scroll and form state.
	 */
	private commit(target: Arrangement, nav: string): void {
		// Panels size themselves as they draw, so make them measure the shell as it
		// is now rather than trust the last pass's numbers.
		this.geom = undefined;
		// Pin flags for panels this commit *creates* (a reload or cold restore).
		// Live panels keep their own: a pin is the user's mark, not history state.
		const pinned = route.current.state.pinned;
		const seedPins = new Set<string>(Array.isArray(pinned) ? pinned.map(String) : []);
		const existing = new Map(this.$state.live.map((entry) => [entry.path, entry]));
		const next: PanelEntry[] = [];
		for (const path of target.stack) {
			const kept = existing.get(path);
			if (kept) {
				// Retained; its `order` deliberately stays put — see PanelEntry.order.
				existing.delete(path);
				next.push(kept);
				continue;
			}
			const entry = this.createEntry(path, next.length <= target.focus, seedPins.has(path));
			// An initial load just appears; any later navigation animates its new
			// panels in — beneath what's already there, so a back that re-creates
			// a panel plays out under the one it takes away.
			if (nav !== "load") entry.enter = true;
			next.push(entry);
			this.$open[path] = entry;
		}
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
			maxWidth: "medium" as const,
			width: 0,
		} as PanelEntry;
		// `close` and `open` resolve this panel's place in the stack at call time,
		// so they keep working after a splice has moved it; an `open` from a panel
		// that has since closed falls back to a derived stack, like a link from
		// nowhere. `width` is filled in by `drawPanel`'s sizing scope before the
		// handler draws.
		entry.$panel = A.proxy({
			stack: this,
			params,
			path,
			width: 0,
			visible,
			pinned: pinned || undefined,
			close: () => this.closePath(entry.path),
			open: (href: string, how?: "push" | "replace" | "open") => this.navigate(href, { from: entry.path, how }),
		}) as PanelState;
		return entry;
	}

	/**
	 * Take a panel out of the shell. The *scope* goes now — its `A.clean` hooks run
	 * this tick, so subscriptions, timers and portals stop at the close rather than
	 * at the end of the animation. Only the element lingers to play that animation,
	 * which is what `drawPanel`'s `destroy=` hook hands to {@link playExit}.
	 */
	private beginClose(entry: PanelEntry): void {
		entry.closing = true;
		entry.$panel.visible = false;
		delete this.$open[entry.path];
	}

	/**
	 * A closed panel's send-off, run by Aberdeen once its scope is gone: it fades
	 * where it stands, inert, and leaves the DOM on `transitionend`. A fixed timer
	 * would race the transition and pull the element a frame early, making the
	 * panel appear to fade half-way and vanish; the timeout is only a fallback for
	 * when no `transitionend` is coming (transitions off, element never placed).
	 */
	private playExit(entry: PanelEntry, el: HTMLElement): void {
		// A panel being *redrawn* replaces its element through here too; that one
		// simply goes, so the new one isn't drawn over a ghost of the old.
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
	 * change is still settling, the one on screen otherwise. That window is common
	 * (every `route.back()` waits for a `popstate`), and working from the committed
	 * arrangement inside it would aim a second Escape at the panel the first is
	 * already taking away — two quick Escapes would peel one panel.
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
	 * Put a navigation to the router, or — while one is still settling — behind the
	 * one that is. Only the newest waits; the one it displaces resolves `false`.
	 * A refusal empties the queue rather than running it, since what was queued
	 * was worked out against the arrangement the refused one would have produced.
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
			// The router has already applied the change (and flushed Aberdeen's queue,
			// so our commit has happened) before settling us, so the next one can go
			// straight out against the stack as it now stands.
			if (ok && next) this.start(next.run).then(next.settle, () => next.settle(false));
			else { this.intent = null; next?.settle(false); }
			return ok;
		};
		const settling = Promise.resolve(run()).then(done, (e) => { console.error(e); return done(false); });
		this.settling = settling;
		return settling;
	}

	/**
	 * Make the stack's `index`th panel current without closing anything, leaving
	 * the panels right of it parked out of sight — Escape's way past an unsaved
	 * panel, and back to one. A history entry, so back returns the focus.
	 */
	private focusAt(index: number): Promise<boolean> {
		const arr = this.intended();
		if (index < 0 || index >= arr.stack.length || index === arr.focus) return Promise.resolve(false);
		const target = { stack: arr.stack, focus: index };
		const path = arr.stack[index];
		return this.issue(target, () => {
			// The panel gets its own last search and hash back (see PanelEntry.search).
			const entry = this.$state.live.find((e) => e.path === path);
			return route.go({ path, search: entry?.search, hash: entry?.hash, state: this.stateFor(target) });
		});
	}

	/**
	 * One step back along the stack — what Escape does (`main()` calls this; it is
	 * not {@link PanelStack} API). Normally that closes the current panel; when it
	 * holds {@link Panel.unsaved} work, or panels sit parked beyond it, the focus
	 * moves left instead. Resolves `false` at the stack's start.
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
	 * Close all come down to. `false` when that path isn't open, is the stack's
	 * only panel, or holds {@link Panel.unsaved} work.
	 *
	 * Closing the current panel at the stack's end pops back through history to
	 * the entry beneath it (restoring its scroll and search state); the
	 * arrangement is part of the match, so an entry where the closing panel was
	 * merely parked won't do. Every other close is a *splice*, which still earns
	 * its own history entry — hence `route.go` here rather than `navigate()`,
	 * whose "link to an open panel" check would turn it into a focus move.
	 */
	private closePath(path: string): Promise<boolean> {
		return A.peek(() => {
			const arr = this.intended();
			const index = arr.stack.indexOf(normalizePath(path));
			if (index < 0 || arr.stack.length < 2 || this.unsavedAt(arr.stack[index])) return Promise.resolve(false);
			const stack = arr.stack.filter((_, i) => i !== index);
			// Closing the current panel hands the focus to the panel on its left;
			// closing any other panel moves the focus not at all.
			const focus = index === arr.focus ? Math.max(0, index - 1) : arr.focus - (index < arr.focus ? 1 : 0);
			const target = { stack, focus };

			if (index === arr.focus && index === arr.stack.length - 1) {
				// With no matching history entry the current one is replaced instead,
				// and the panel beneath gets its stashed query back via the fallback.
				// Pins can't ride along there (the match target's `state` would shadow
				// it), so they are re-stamped onto whatever entry we land on.
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
				// The current panel keeps its search and hash — `go()` would otherwise
				// default them away. If the focus moved, the new panel gets its own back.
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
	 * Navigate to `href` — the one implementation behind a link click,
	 * {@link Panel.open} and the stack's own methods, so none can drift.
	 *
	 * `from` is the panel the navigation starts from, absent when it has none (a
	 * nav item), in which case the stack is derived or taken from `beneath`.
	 *
	 * `how` is the link's `data-panel` attribute, picking how much of `from`'s
	 * context the target keeps: a push (the default, and the fallback for
	 * unrecognised values) builds on `from`, `"replace"` keeps only what is
	 * beneath it, `"open"` keeps nothing. A target that is already open is
	 * returned to by a push and *moved* — alive — by the other two, since the
	 * stack never holds a path twice.
	 *
	 * Resolves `true` once the navigation lands (already being there counts).
	 */
	private navigate(href: string, { from, how, beneath }: { from?: string; how?: string; beneath?: readonly string[] } = {}): Promise<boolean> {
		const mode = how ?? this.opts.linkNavigation;
		const origin = mode === "open" ? null : from ?? null;
		const replace = mode === "replace";
		return A.peek(() => {
			let url: URL;
			try { url = new URL(href, location.href); } catch { return Promise.resolve(false); }
			const path = normalizePath(url.pathname);
			const arr = this.intended();

			// The target always ends up on top; only what it lands on differs.
			const open = beneath ? -1 : arr.stack.indexOf(path);
			let target: Arrangement;
			if (open >= 0 && mode !== "replace" && mode !== "open") {
				// A push to an open path is a return: the panel takes back its place
				// and whatever was stacked on top closes (a breadcrumb is such a
				// link). Pinned panels above it park instead, keeping their order.
				const above = this.pinnedIn(arr.stack.slice(open + 1), []);
				target = { stack: [...arr.stack.slice(0, open + 1), ...above], focus: open };
			} else {
				// The target opens on top of the link's own panel — in its place for a
				// `replace` — closing the panels after it. With no originating panel
				// the base is the caller's `beneath` or derived from the path, which
				// is what makes a nav click and a cold deep link land identically.
				const originIndex = origin == null ? -1 : arr.stack.indexOf(origin);
				const raw = beneath
					? beneath.map(normalizePath)
					: originIndex < 0
						? this.deriveStack(path).slice(0, -1)
						: arr.stack.slice(0, replace ? originIndex : originIndex + 1);
				// A stack never holds the same path twice, so the target is dropped
				// from the base (a `replace`/`open` aimed mid-stack moves that panel
				// to the top, alive) and `beneath` is deduplicated for the same reason.
				const base = raw.filter((p, i, all) => p !== path && all.indexOf(p) === i);
				// Pinned panels ride along beneath the new one, keeping their order
				// (unsaved ones `propose` parks). A replaced origin closes pin or no
				// pin: replacing is the panel's own doing, not navigation over it.
				const under = [...base, ...this.pinnedIn(arr.stack, [...base, path, replace ? origin : null])];
				target = { stack: [...under, path], focus: under.length };
			}

			// A panel we return to gets its own search and hash back (see
			// PanelEntry.search), unless the link carries its own, which win.
			const returning = open >= 0 ? this.$state.live.find((e) => e.path === path) : undefined;
			const search = url.search ? Object.fromEntries(new URLSearchParams(url.search)) : returning?.search ?? {};
			const hash = url.hash || returning?.hash || "";

			// Going nowhere at all — not even a history entry.
			if (target.focus === arr.focus && sameStack(target.stack, arr.stack)
				&& url.search === location.search && (url.hash || "") === (location.hash || "")) {
				return Promise.resolve(true);
			}
			const state = this.stateFor(target);
			if (replace) {
				// A replace is a redirect: writing the route in place makes the
				// router replaceState rather than push, so the target takes the
				// replaced panel's history entry too and the back button never
				// returns to it. The router consults an app's guard as it applies
				// this; the verdict read below sees a synchronous veto, while an
				// async guard reports `false` here and re-applies on approval —
				// the in-place trade-off `route.setGuard` documents.
				return this.issue(target, () => {
					route.current.path = path;
					route.current.search = search;
					route.current.hash = hash;
					route.current.state = state;
					A.runQueue();
					return route.current.path === path;
				});
			}
			return this.issue(target, () => route.go({ path, search, hash, state }));
		});
	}

	/** Programmatic push/replace, with the current panel as the implied origin. */
	private pushPath(path: string, replace: boolean): Promise<boolean> {
		return A.peek(() => {
			const arr = this.intended();
			return this.navigate(path, { from: arr.stack[arr.focus], how: replace ? "replace" : "push" });
		});
	}

	// ── Link interception ──────────────────────────────────────────────────

	/**
	 * Link handling through `route.interceptLinks()`, whose hook hands us the
	 * anchor so we can decide what the click means. The exclusion rules (targets,
	 * downloads, modified clicks, external URLs) live in Aberdeen.
	 *
	 * A link inside a panel is that panel's {@link Panel.open}, with `data-panel`
	 * as its `how`. A link outside every panel — a nav item, one in a dialog —
	 * has nothing to build on, so it replaces the stack as a cold link would.
	 */
	private interceptLinks(): void {
		route.interceptLinks((url, anchor, e) => {
			// A modified keystroke is not a plain activation. Aberdeen leaves a
			// ctrl/⌘/shift/alt *click* to the browser but not the Enter that stands
			// in for it, so routing this one would turn the keyboard's own
			// open-in-a-new-tab into an ordinary navigation. Declining leaves the
			// event untouched, for the browser to open where the click would have.
			if (e instanceof KeyboardEvent && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return false;
			const how = anchor.getAttribute("data-panel") ?? undefined;
			// The panel the link lives in: the enclosing `.s-panel`, or the current
			// panel for its actions once a narrow shell has promoted them into the
			// top bar (see main.ts), outside every `.s-panel`.
			const panelEl = anchor.closest<HTMLElement>(".s-panel");
			const entry = panelEl
				? this.$state.live.find((e) => e.el === panelEl)
				: anchor.closest(".s-panel-origin")
					? this.$state.live[this.$state.focus]
					: undefined;
			void this.navigate(url.href, { from: entry?.path, how });
			return true;
		});
	}

	// ── What the shell's top bar asks ──────────────────────────────────────

	// The {@link PanelStack} face, where the documentation lives. These are the
	// *queries* of the "queries subscribe, commands peek" rule on `$state`.

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
		return this.navigate(path, { how: "open", beneath });
	}

	closePanel(path?: string): Promise<boolean> {
		return A.peek(() => {
			const arr = this.intended();
			return this.closePath(path ?? arr.stack[arr.focus] ?? "");
		});
	}

	// ── Live settings ──────────────────────────────────────────────────────
	// `main()` feeds these from small reactive scopes, so an app changing them at
	// runtime is adopted in place — nothing redrawn, no panel losing its state.
	// Not {@link PanelStack} API: this is how `main()` talks to the stack.
	// `navWidth`/`maxWidth` need no counterpart; they resize the column region,
	// which the layout engine already observes.

	/** Adopt a changed `columns` setting: one layout pass, nothing redrawn. */
	setColumns(columns: "auto" | "single" | undefined): void {
		if (this.opts.columns === columns) return;
		this.opts.columns = columns;
		this.scheduleLayout();
	}

	/** Adopt a changed `linkNavigation` default; the next click reads it. */
	setLinkNavigation(mode: "push" | "replace" | "open" | undefined): void {
		this.opts.linkNavigation = mode;
	}

	/**
	 * The breadcrumb stack, drawn by `main()` into the top bar: every open panel,
	 * oldest first, the ones on screen in bold. Every crumb but the current one is
	 * a plain link, and a link to an open panel returns to it (see `navigate`),
	 * closing what was stacked on top. Right-click offers pinning and closing.
	 */
	drawCrumbs(): void {
		// The same row `S.tabs` uses: it scrolls when the stack outgrows the bar,
		// with a ‹ / › a mouse can use over whichever end has crumbs left to reach.
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
		// Safe to close over: the crumb list is rebuilt whenever the stack or its
		// focus changes, so this stays `paths[index]`'s entry for the crumb's life.
		const entry = this.$state.live[index];
		// A real link, so it can be hovered, middle-clicked and copied. No click
		// handling of its own: link interception already turns a link to an open
		// panel into the focus move a crumb wants (see `navigate`).
		return A(current ? "span.s-crumb aria-current=page" : "a.s-crumb", () => {
			if (!current) A("href=", path);
			// Bold = on screen right now, so the stack says which panels are the
			// visible columns, not just which one is current.
			A(() => { if (entry?.$panel.visible) A(".s-crumb-on"); });
			A(() => { if (entry?.$panel.unsaved) dotIcon({ size: "0.45em", attrs: ".s-crumb-unsaved" }); });
			A(() => { if (entry?.$panel.pinned) pinIcon({ size: "0.85em", attrs: ".s-crumb-pin" }); });
			// `||`, not `??`: the root path's last segment is the empty string.
			A(() => { A("#", entry?.$panel.title ?? entry?.$ui.fallback ?? (path.split("/").pop() || path)); });
			// `link` puts the browser's own link entries — Open in new tab, Copy
			// link — above the rule; the shell's own verbs sit below it.
			addContextMenu({ link: path, items: [
				{
					label: () => { A(() => { A("#", entry?.$panel.pinned ? "Unpin" : "Pin"); }); },
					icon: () => { A(() => { (entry?.$panel.pinned ? pinOffIcon : pinIcon)(); }); },
					click: () => { if (entry) this.togglePin(entry); },
				},
				{
					label: "Close",
					icon: closeIcon,
					// Read here, in the crumb's own scope, so flipping the flag
					// redraws the crumb and the ● above stays in step with this.
					disabled: entry?.$panel.unsaved === true,
					click: () => void this.closePath(path),
				},
			] });
		}) as HTMLElement;
	}

	/**
	 * Flip a panel's pin (see {@link Panel.pinned}). The current history entry's
	 * snapshot is rewritten too, so a reload keeps the pin.
	 */
	private togglePin(entry: PanelEntry): void {
		entry.$panel.pinned = !entry.$panel.pinned || undefined;
		route.current.state.pinned = this.pinnedPaths();
	}

	// ── document.title ─────────────────────────────────────────────────────

	/**
	 * `"<panel title> · <app title>"`, kept in sync with the current panel, and
	 * prefixed `"• "` while *any* open panel holds unsaved work — not just the
	 * current one, since the risk of losing it is tab-wide.
	 */
	private watchTitle(): void {
		const original = document.title;
		A(() => {
			const entry = this.$state.live[this.$state.focus];
			const panelTitle = entry?.$panel.title ?? entry?.$ui.fallback;
			const appTitle = typeof this.opts.title === "string" ? this.opts.title : undefined;
			const dirty = this.$state.live.some((e) => e.$panel.unsaved);
			const title = panelTitle && appTitle ? `${panelTitle} · ${appTitle}` : panelTitle || appTitle;
			if (title) document.title = (dirty ? "• " : "") + title;
		});
		A.clean(() => { document.title = original; });
	}

	/**
	 * While any open panel holds unsaved work, closing the tab runs into the
	 * browser's own are-you-sure, with that panel brought on screen as the
	 * question is raised rather than left parked out of sight.
	 */
	private guardTabClose(): void {
		if (typeof window === "undefined") return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			const dirty = this.$state.live.find((entry) => entry.$panel.unsaved);
			if (!dirty) return;
			e.preventDefault();
			e.returnValue = true; // Chrome/Edge < 119
			// Bring the unsaved panel on screen, so what is holding the tab is in
			// front of the user the moment they choose to stay.
			// `visible` is written by the layout pass, which waits for an animation
			// frame that a tab on its way out may never get. Settle it first, or a
			// panel parked a moment ago still reads as on screen and the guard skips
			// the very move it exists to make.
			this.flushLayout();
			if (!dirty.$panel.visible) void this.focusAt(this.intended().stack.indexOf(dirty.path));
		};
		// Registered only while a panel actually holds unsaved work: a page with a
		// `beforeunload` listener is shut out of the back/forward cache, a tax
		// every navigation in the app would otherwise pay.
		A(() => {
			if (!this.$state.live.some((entry) => entry.$panel.unsaved)) return;
			window.addEventListener("beforeunload", onBeforeUnload);
			A.clean(() => window.removeEventListener("beforeunload", onBeforeUnload));
		});
	}

	// ── Rendering ──────────────────────────────────────────────────────────

	/**
	 * Draw the column viewport into the current element. Called by `main()`.
	 *
	 * A column is the panel's own content plus the one bit of chrome the shell
	 * places for it: its {@link Panel.actions} (see {@link drawActions}).
	 */
	drawColumns(): void {
		const container = A("div.s-panels role=main", () => {
			// Published here rather than from the return value below: a panel sizes
			// itself from the shell's measurements, and the first ones do that while
			// this call is still running.
			this.containerEl = A() as HTMLElement;
			// Mounted by path (see `$open`); DOM order is creation order, which is
			// all that's needed — `layout()` places and stacks the columns itself.
			A.onEach(
				this.$open,
				(entry) => this.drawPanel(entry),
				(entry) => entry.order,
			);
		}) as HTMLElement;

		if (typeof ResizeObserver !== "undefined") {
			// The region *is* the content area every width is measured from, so
			// watching it catches a window resize, the sidebar coming or going, and
			// the shell's own `maxWidth` changing alike.
			const ro = new ResizeObserver(() => this.layout());
			ro.observe(container);
			A.clean(() => ro.disconnect());
		}
		A.clean(() => { if (this.containerEl === container) this.containerEl = undefined; });
		this.scheduleLayout();
	}

	private drawPanel(entry: PanelEntry): void {
		let el: HTMLElement | undefined;

		// How much room the panel wants, resolved *before* its content is drawn:
		// an element that arrives width-less has no box for its content to measure
		// against until the next frame — a frame too late. Reactive, so a panel
		// changing its mind later reflows in place rather than being redrawn.
		A(() => {
			const asked = entry.$panel.maxWidth;
			entry.maxWidth = asked === "small" || asked === "large" || asked === "none" ? asked : "medium";
			const width = this.roomFor(entry.maxWidth);
			if (!width) return;
			entry.width = width;
			// Published to the panel too, so a handler can read the box it is about
			// to draw into without measuring it.
			if (A.peek(entry.$panel, "width") !== width) entry.$panel.width = width;
			// The first run has no element yet — it's created with this width below.
			if (!el) return;
			el.style.width = `${width}px`;
			this.scheduleLayout();
		});

		el = A(`section.s-panel${entry.width ? ` w:${entry.width}px` : ""}`, "destroy=", (node: HTMLElement) => this.playExit(entry, node), () => {
			// In its own scope: the chrome may redraw freely, the body below may not.
			A(() => this.drawActions(entry));

			A("div.s-content", () => {
				entry.draw(entry.$panel);
				// After the content, so there is something to scroll when restoring.
				route.persistScroll(entry.path);
				// A panel that set no title borrows its first line of text (the DOM
				// is built already — Aberdeen draws synchronously) so the crumbs and
				// document.title never go blank. Peeked: a rename must not redraw.
				if (A.peek(entry.$panel, "title") == null) {
					const text = firstText(A() as HTMLElement);
					if (text && A.peek(entry.$ui, "fallback") !== text) entry.$ui.fallback = text;
				}
			});

			// Its own scope, so flipping the flag doesn't redraw the panel's content.
			// A held-back panel shows nothing: it is still off screen.
			A(() => {
				if (!entry.$panel.loading || entry.$ui.holding) return;
				A("div.s-panel-loading aria-hidden=true", () => { A("i"); A("i"); A("i"); });
			});
		}) as HTMLElement;

		entry.el = el;
		// Nothing may animate from the arbitrary initial spot; `layout()` gives the
		// panel its place (and turns transitions back on) in the coming frame,
		// before anything is painted. A redraw lands here too, with a new element
		// that has to be placed again first.
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
	 * top bar carrying them otherwise. Everything else is the panel's own content.
	 */
	private drawActions(entry: PanelEntry): void {
		if (this.opts.$shell.narrow || entry.$panel.actions == null) return;
		A("div.s-panel-actions", () => drawSlot(entry.$panel.actions));
	}

	// ── Layout engine ──────────────────────────────────────────────────────

	scheduleLayout(): void {
		if (this.layoutQueued) return;
		this.layoutQueued = true;
		requestAnimationFrame(() => this.flushLayout());
	}

	/**
	 * Run the pending layout pass now instead of on the frame it waits for, for
	 * callers that must read what only the pass knows (`$panel.visible`,
	 * `$panel.width`) and can't wait. Does nothing when no pass is owed.
	 */
	private flushLayout(): void {
		if (!this.layoutQueued) return;
		this.layoutQueued = false;
		this.layout();
	}

	/**
	 * Measure the content area, and with it the width a panel of each size gets.
	 * The column region *is* that area (CSS's doing), so there is nothing to add
	 * up here that could drift from the bars above and below. Widths stay
	 * fractional: a rounded column edge would drift a pixel away from that chrome.
	 *
	 * The area divides into the fewest whole number of columns of at most
	 * {@link SMALL_MAX_PX} — so 1080px is two of 540, 1520px three of ~507 —
	 * keeping columns as wide as the cap allows rather than as narrow as
	 * {@link SMALL_MIN_PX} permits. Only below 720px can that division dip under
	 * the minimum; there a single column, capped at 540, centres in the area
	 * instead. A width is therefore a pure function of the window: a panel NEVER
	 * resizes because a neighbour came or went.
	 *
	 * `undefined` while the shell has no width yet (not in a document, or
	 * `display:none`); the next pass tries again.
	 */
	private measure(): Geometry | undefined {
		const el = this.containerEl;
		const area = el ? el.getBoundingClientRect().width : 0;
		if (!area) return undefined;
		const cols = Math.ceil(area / SMALL_MAX_PX);
		const small = area / cols >= SMALL_MIN_PX ? area / cols : Math.min(area, SMALL_MAX_PX);
		const units = (n: number) => Math.min(n * small, area);
		return { area, size: { small, medium: units(2), large: units(3), none: area } };
	}

	/**
	 * The measurements this pass runs on, taken once per pass and per commit and
	 * shared with the panels drawn in between: they must all size against the
	 * same shell, and a `getBoundingClientRect()` each is a forced reflow each.
	 */
	private geometry(): Geometry | undefined {
		return (this.geom ??= this.measure());
	}

	/** How wide a panel asking for this is, right now; 0 while the shell can't be measured. */
	private roomFor(size: PanelSize): number {
		return this.geometry()?.size[size] ?? 0;
	}

	/**
	 * Size and position every panel — everything CSS can't work out for itself:
	 * which panels exist, which are visible, how wide each is and where it sits.
	 * The motion between two such arrangements is CSS's job.
	 */
	private layout(): void {
		const container = this.containerEl;
		const shell = container?.closest<HTMLElement>(".s-main");
		if (!container || !shell) return;
		// Always runs from a fresh frame (rAF, a ResizeObserver), so no reactive
		// scope is active and nothing read here can subscribe to anything.
		const live = this.$state.live;
		const n = live.length;
		// A panel that hasn't drawn yet has no width to contribute, which would
		// make this pass meaningless. Every mount schedules another, so just wait.
		if (!n || live.some((entry) => !entry.el)) return;

		// This pass measures afresh — it is the one thing that runs after a resize.
		this.geom = undefined;
		const geom = this.geometry();
		if (!geom) return;

		const single = this.opts.columns === "single";

		// A resize of the window (or of the shell, via `navWidth`/`maxWidth`) must
		// be adopted instantly — geometry chasing the window through a transition
		// reads as lag. Only what a *panel* did is worth animating, so
		// `.s-shell-snap` suppresses every standing transition for this one pass.
		const snap = this.lastGeom?.area !== geom.area;
		if (snap) {
			this.lastGeom = geom;
			shell.classList.add("s-shell-snap");
		}

		const width = (entry: PanelEntry) => geom.size[entry.maxWidth];

		// The visible run: as many columns as fit, ending at the current panel,
		// which always shows. Panels beyond it are parked (see phase 1).
		const cur = Math.min(this.$state.focus, n - 1);
		let first = cur;
		let runSum = width(live[cur]);
		if (!single) {
			for (let i = cur - 1; i >= 0; i--) {
				const sum = runSum + width(live[i]);
				if (sum > geom.area) break;
				runSum = sum;
				first = i;
			}
		}

		// A run that doesn't fill the fixed-width area centres in it — unless
		// panels sit crowded out on its left: then it hugs the left edge instead,
		// so the strip crosses that edge with no gap and a reveal is a plain
		// slide back in.
		const left = first > 0 ? 0 : (geom.area - runSum) / 2;

		for (let i = first; i <= cur; i++) live[i].width = width(live[i]);
		// Never-visible panels get their would-be width, so a reveal doesn't start
		// from nothing.
		for (const entry of live) {
			if (!entry.width) entry.width = width(entry);
		}

		// Phase 1 — lay the strip out for this frame: each panel flush against
		// its neighbours, the visible run [first..cur] in the viewport, earlier
		// panels continuing off its left edge and parked ones held past its
		// right. Placed panels get their new positions — their standing
		// transitions carry them there. Newcomers, transitions still off, get
		// their *start* state instead: their strip position anchored to the OLD
		// position of the nearest placed panel beneath them (`delta`), so the
		// slide in is one motion with the panels making room. With nothing
		// beneath them to come from — or nothing moving — that start is where
		// they already stand, and they simply fade in.
		const fresh: { entry: PanelEntry; x: number }[] = [];
		let x = left;
		let delta = 0;
		for (let i = 0; i < first; i++) x -= live[i].width;
		for (let i = 0; i < n; i++) {
			const entry = live[i];
			const el = entry.el!;
			const shown = i >= first && i <= cur;
			// Parked panels never dip into the viewport, however short the run.
			if (i === cur + 1) x = Math.max(x, geom.area);
			// A panel that mounts while still fetching holds its fade for a
			// moment, so it can appear with real content instead of empty.
			if (entry.enter || !entry.placed) {
				if (!entry.$panel.loading || entry.holdDone) entry.$ui.holding = false;
				else if (!entry.$ui.holding) { entry.$ui.holding = true; this.holdEnter(entry); }
			}
			if (entry.placed) {
				delta = parseFloat(el.style.left) - x;
				el.style.left = `${x}px`;
				// A fade held back for content starts the moment its hold lifts.
				if (entry.enter && !entry.$ui.holding) this.releaseEnter(entry);
			} else {
				fresh.push({ entry, x });
				const entering = entry.enter && shown;
				el.style.left = `${entering ? x + delta : x}px`;
				if (entering) el.classList.add("s-panel-enter", "s-panel-new");
			}
			el.style.width = `${entry.width}px`;
			x += entry.width;
			// Written only on a change, so per-panel UI hanging off `visible` or
			// `width` isn't rebuilt by every pass.
			if (entry.$panel.visible !== shown) entry.$panel.visible = shown;
			if (entry.$panel.width !== entry.width) entry.$panel.width = entry.width;
			el.classList.toggle("s-panel-sep", shown && i > first);
			// Off-screen panels stop rendering, keeping their DOM.
			el.classList.toggle("s-panel-hidden", i < first);
			el.classList.toggle("s-panel-parked", i > cur);
			el.toggleAttribute("inert", !shown);
		}

		// Phase 2 — reading a layout property forces the browser to adopt those
		// start states (and a snap pass's transition-free geometry) to animate from.
		if (fresh.length || snap) void container.offsetWidth;
		if (snap) shell.classList.remove("s-shell-snap");
		// Phase 3 — newcomers get their transitions and their resting place: the
		// slide starts now, and the fade with it — unless the panel is holding
		// for its content, which keeps the fade's start state on until then.
		for (const { entry, x } of fresh) {
			const el = entry.el!;
			el.style.transition = "";
			el.style.left = `${x}px`;
			entry.placed = true;
			if (!entry.$ui.holding) this.releaseEnter(entry);
		}
	}

	/** Start (or skip) a newcomer's fade-in; any slide is already underway. */
	private releaseEnter(entry: PanelEntry): void {
		entry.enter = false;
		const el = entry.el;
		if (!el || !el.classList.contains("s-panel-enter")) return;
		el.classList.remove("s-panel-enter");
		// Keep it beneath its elders until the fade is over — by timer, a hair
		// past it, since a resize can snap the fade short without ever firing a
		// `transitionend`.
		const timer = setTimeout(() => {
			this.timers.delete(timer);
			el.classList.remove("s-panel-new");
		}, PAGE_MS + 80);
		this.timers.add(timer);
	}

	/** Let a `loading` panel's fade-in wait — but not indefinitely. */
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

function drawDefaultNotFound($panel: Panel<{}>): void {
	A("p fg:$s-muted", () => A("#", `No panel at ${$panel.path}`));
}

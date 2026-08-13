import A from "aberdeen";
import * as route from "aberdeen/route";
import { NARROW_PX } from "../core.js";

/**
 * Routed, multi-column panel navigation for {@link main}.
 *
 * Each route draws one screen of the app, called a panel, and as many panels as
 * fit are shown at a time. On a phone that is one, so a link opens a new panel
 * on top and closing it brings the previous one back. On a wider screen the
 * panels that would have covered each other sit side by side instead, oldest on
 * the left. The app's own code is the same either way.
 *
 * Navigation runs through `aberdeen/route`: the URL holds the top panel, and
 * the ones beneath it are stored beside it in the history entry. So back and
 * forward step through whole arrangements of columns, and a reload (or a shared
 * link) brings the same columns back.
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

/** A panel draw function: it receives the panel's {@link Page} and draws into the current scope. */
export type RouteHandler<P = any> = (page: Page<P>) => void;

/**
 * A route table: path templates mapped to panel draw functions. Used as the
 * loose (non-inferred) type; `S.main()` infers a more precise type from the
 * literal you pass, so each handler's `$page.params` is typed per its key.
 */
export type Routes = Record<string, RouteHandler>;

/**
 * The shape `S.main()`'s `routes` option is checked against: every key types its
 * own handler's `params`. Used as a self-referential generic constraint, which
 * is what makes `$page.params` infer from the route key.
 */
export type RouteTable<R> = { [K in keyof R & string]: (page: Page<Prettify<PathParams<K>>>) => void };

// ─── The Page object ─────────────────────────────────────────────────────────

/**
 * What a route handler gets: the params from its route, plus everything the
 * shell needs to know about the panel it is drawing. It's an Aberdeen proxy, so
 * you can set things later, such as a `title` that arrives with your data or
 * `loading` going back to `false`, and the shell keeps up.
 *
 * Search params and the `#hash` belong to the top panel only. A panel with
 * another one on top of it keeps just its path, so anything a panel needs in
 * order to redraw itself has to live in that path.
 */
export interface Page<P = Record<string, string | number | string[]>> {
	/**
	 * The params matched from this panel's path, typed per its route key:
	 * `[x]` is a `string`, `[x=integer]` a `number`, `[...x]` a `string`.
	 * Read-only.
	 */
	readonly params: P;
	/** This panel's path, e.g. `"/projects/7"`. Read-only. */
	readonly path: string;
	/** Shown in `document.title` while this panel is top-most. */
	title?: string;
	/**
	 * How much room this panel takes. The content area is the page, at most
	 * 1280px wide, minus the nav sidebar; the widths below assume a sidebar of
	 * around 170px, so without one add that back.
	 *
	 * - `"small"` is 360 to 540px once two panels fit side by side, which is
	 *   what makes it right for lists, detail forms, and anything else that
	 *   reads well at phone width. Below that it takes the whole content area
	 *   (so up to ~730px), like a medium does. A lone small leaves its other
	 *   half empty, and that is exactly where the next small lands, without
	 *   anything on screen moving.
	 * - `"medium"` (the default) takes the whole content area: up to ~1100px,
	 *   and the screen width on a phone. The safe default for ordinary screens.
	 *   Nothing fits beside a medium on a standard 1280px page, though on a wide
	 *   enough window a small still can.
	 * - `"large"` takes the whole window, with no upper limit (~1750px on a
	 *   1920px screen): for boards, wide tables and dense dashboards. While it's
	 *   open the whole shell (top bar, content and footer) stretches to the
	 *   screen edges rather than stopping at 1280px.
	 *
	 * When more columns fit than the standard page holds (three smalls, or a
	 * medium and a small) the page itself grows, staying centred, to hold them.
	 *
	 * A panel's width depends only on the size of the window, never on what else
	 * is open, so opening or closing a panel never resizes the ones already on
	 * screen. This is read **once**, right after your handler runs, so set it
	 * there; later changes are ignored.
	 */
	layout?: "small" | "medium" | "large";
	/**
	 * Set this while you're fetching what the panel needs, and back to `false`
	 * when you're done. A new panel waits a moment before sliding in, so it can
	 * arrive with real content instead of empty; if the wait drags on it slides
	 * in anyway and shows a loading indicator until the flag clears. It only
	 * affects the animation; the stack, the URL and `requestClose` never wait
	 * for it.
	 */
	loading?: boolean;
	/**
	 * Your chance to say no. Everything that would close this panel waits for
	 * it: Escape, the panel's own ✕ or Cancel button ({@link Page.close}, or a
	 * box with `close: true`), the browser's back button, a link that would
	 * close it, and {@link panels}.`close()`. Return `false` to keep the panel
	 * open, usually after a dirty check and a {@link confirm}.
	 */
	requestClose?: () => boolean | Promise<boolean>;
	/**
	 * Closes **this** panel, wherever it sits in the stack. The top panel goes
	 * back to whatever was underneath it; any other panel is taken out on its
	 * own, leaving the columns to its right where they are, with their state,
	 * and the URL alone, since the top panel didn't move. Either way it
	 * becomes a history entry, so the browser's back button brings it back.
	 *
	 * Resolves `false` if the panel didn't close: {@link Page.requestClose} said
	 * no, it was the only panel on the stack (so there's nothing to go back to),
	 * or another navigation got there first. The shell draws no back arrows or
	 * ✕ of its own, so this (or `S.box`'s `close` option) is how a panel gives
	 * the user a way out.
	 *
	 * @example
	 * ```ts
	 * S.button({ content: "Cancel", attrs: ".neutral", click: () => void $page.close() });
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
 * two different paths, so the same record could sit open in two panels at once.
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
 * Turn a route key into segment tokens, throwing on malformed templates. A
 * segment is a param only when it is *entirely* a bracket group, so a literal
 * segment that merely contains brackets (`/v[1]beta`) stays literal.
 */
function compileRoute(key: string, draw: RouteHandler): CompiledRoute {
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
	return { key, segs, draw };
}

/** Percent-decode a path segment, leaving it alone when it isn't valid encoding. */
function decodeSeg(value: string): string {
	try { return decodeURIComponent(value); } catch { return value; }
}

function matchRoute(r: CompiledRoute, segments: string[]): Record<string, any> | null {
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
 * The one duration every bit of panel motion shares: the enter/exit fades, the
 * `left` moves of columns shifting sideways, and the ensemble-width transition
 * the chrome follows (see `--s-shell-w` in main.ts). Published as the
 * `--s-panel-ms` custom property below, so CSS and JS can't drift apart.
 */
const PANEL_MS = 450;
/** How long a freshly pushed `loading` panel holds its enter animation. */
const LOADING_HOLD_MS = 300;
/**
 * The standard page width: sidebar plus content area, capped by the window.
 * `"medium"` fills the content-area part of this exactly; only a `"large"`
 * panel makes the shell grow past it.
 */
const SHELL_PX = 1280;
/** The gap between two `"small"` panels sitting two-up. */
const GUTTER_PX = 24;
/** Don't pair smalls when half the content area would be narrower than this. */
const PAIR_MIN_PX = 360;

// ─── Module-level styling ────────────────────────────────────────────────────

A.insertGlobalCss({
	":root": `--s-panel-ms:${PANEL_MS}ms`,
	// The clipping viewport that the columns slide through. Panels are absolutely
	// positioned inside it, with their width and x offset set from JS (see
	// `layout()`), so they can animate between arrangements.
	".s-panels": "flex:1 min-width:0 min-height:0 position:relative overflow:hidden",
	".s-panel": {
		// A panel rests at a plain `left` offset and carries no transform: a
		// transformed element is composited, which costs it subpixel text
		// antialiasing. `transform` is used only to play the enter/exit slides,
		// where the compositing is what makes them cheap. There is deliberately
		// no `width` transition: widths depend only on the window, change only in
		// `.s-shell-snap` passes, and a column's content never reflows while the
		// arrangement moves.
		// Every duration is `--s-panel-ms`, so a column's move, its neighbour's fade
		// and the chrome recentering around them all run as one motion. The drift
		// eases out (it should read as a slow settle) while the fade runs *linear*
		// across the whole duration — an eased opacity spends its last stretch near
		// zero, which looks like the panel vanishing rather than fading.
		// No `overflow:hidden` here: the scroll container below clips the content
		// itself, and the pair hairline sits in the gutter *outside* the panel.
		"&":
			"position:absolute top:0 bottom:0 left:0 display:flex flex-direction:column " +
			"visibility:visible transition: left var(--s-panel-ms) ease, transform var(--s-panel-ms) ease-out, opacity var(--s-panel-ms) linear, visibility 0s;",
		// The scroll container. Mirrors content mode's `main > .s-content`: same
		// padding, and the same scrollbar inset (see `.s-scroll-y` in main.ts) so a
		// single-column shell is pixel-identical to a non-routed one.
		"> .s-content": "flex:1 min-height:0 overflow-y:auto overflow-x:hidden p:$3",
		"> .s-content.s-scroll-y": "margin-right:$3",
		// A vertical hairline centred in the gutter between two paired smalls,
		// fading out at both ends — the same treatment as the sidebar's `.s-nav-sep`.
		"&.s-panel-sep::before":
			`content:'' position:absolute left:-${GUTTER_PX / 2}px top:0.6rem bottom:0.6rem width:1px ` +
			"background: linear-gradient(to bottom, transparent, $s-faint 18%, $s-faint 82%, transparent);",
		// One vocabulary for every arrival and departure: a gradual fade over a short,
		// slow drift — 8cqw (`cqw`: `.s-main` is the container). Panels appear and
		// leave at the right edge; being crowded out at the left edge is its mirror.
		//
		// The start state of an enter, adopted with transitions off and then
		// dropped, which is what makes the panel settle instead of jumping.
		"&.s-panel-enter": "opacity:0 transition:none transform: translateX(8cqw);",
		// On its way out: fading where it stands, drifting the same short distance,
		// and out of reach while it does. It is removed from the DOM when the fade
		// itself ends (see `beginClose`), never part-way through it.
		"&.s-panel-closing": "opacity:0 pointer-events:none transform: translateX(8cqw);",
		// Crowded out from under the visible run. It keeps its DOM (and thus its
		// scroll position and half-typed forms), so `display:none` is out —
		// `visibility` takes it out of the rendering instead, but only once the fade
		// has played: a transitioned `visibility` counts as *visible* for the whole
		// duration and flips at the very end. Revealing it again uses the rule above
		// (`visibility 0s`), so it comes back instantly.
		"&.s-panel-hidden":
			"opacity:0 visibility:hidden transform: translateX(-8cqw); " +
			"transition: left var(--s-panel-ms) ease, transform var(--s-panel-ms) ease-out, opacity var(--s-panel-ms) linear, visibility var(--s-panel-ms);",
	},
	// A window resize (and the very first pass) must track the window instantly,
	// not rubber-band 450ms behind it: the layout engine raises this class on the
	// shell for exactly those passes, applies the new geometry, and drops it
	// after a forced reflow. Beats the standing transitions on specificity.
	".s-main.s-shell-snap .s-panel": "transition:none",
	// On a narrow shell the single column is edge-to-edge, so there is no inset
	// chrome for the scrollbar to line up with — cancel the `.s-scroll-y` margin
	// (the twin of content mode's rule in main.ts).
	[`@container (max-width: ${NARROW_PX}px)`]: {
		".s-panel > .s-content.s-scroll-y": "margin-right:0",
	},
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

interface PanelEntry {
	/** Unique and stable; the key `$ids` (and thus the DOM) is keyed by. */
	id: number;
	/**
	 * Depth in the stack at creation time, and the DOM sort key. Deliberately never
	 * updated: rewriting it would make Aberdeen redraw the panel, throwing away the
	 * scroll position and half-typed forms rule 5 promises to keep. So after a
	 * panel is spliced out of the middle of the stack (see `closePanelAt`) the DOM
	 * order goes slightly stale — invisible, since panels are absolutely
	 * positioned, beyond a small drift in tab order.
	 */
	order: number;
	path: string;
	$page: Page<any>;
	draw: RouteHandler;
	/** Extra per-panel UI state that the panel's own render scope observes. */
	$ui: { holding: boolean };
	el?: HTMLElement;
	/** Set once the panel is on its way out, playing its exit animation. */
	closing?: boolean;
	/** Set while an enter animation is still to be played. */
	enter?: boolean;
	/** Whether the panel has been through a full layout pass (and so may animate). */
	placed?: boolean;
	/** Whether its `loading` hold has already expired, so it can't hold again. */
	holdDone?: boolean;
	/** What the panel asked for, read once — right after its handler ran. */
	layout: "small" | "medium" | "large";
	/**
	 * The width it was last laid out at. Visible panels get a fresh value every
	 * pass (widths are a pure function of the content area and small-pairing);
	 * hidden and closing panels keep this, so nothing invisible ever reflows.
	 */
	width: number;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/** Options the panel stack needs from its shell. */
export interface PanelStackOptions {
	routes: Routes;
	notFound?: RouteHandler<{}>;
	/** Set `false` to show only the top panel, however much room there is. */
	stacking?: boolean;
	/** The shell's own title, used as the suffix of `document.title`. */
	title?: unknown;
}

/** At most one routed shell per app — that's what `S.panels` is bound to. */
let active: PanelController | null = null;

export class PanelController {
	private compiled: CompiledRoute[];
	private opts: PanelStackOptions;
	/** The live stack, shallow-to-deep. Closing panels are no longer part of it. */
	private live: PanelEntry[] = [];
	private byId = new Map<number, PanelEntry>();
	private nextId = 1;
	/** Drives rendering: panel id → its `order` (used only as the sort key). */
	$ids = A.proxy<Record<string, number>>({});
	/**
	 * The live stack's paths and its top panel, for reactive readers: the
	 * `document.title` watcher, `main()`'s Escape handling and `S.panels.stack`.
	 */
	$state = A.proxy({ paths: [] as string[], topId: 0 });
	private containerEl?: HTMLElement;
	/** The body width at the last layout; a change means a window resize → snap. */
	private lastBodyW = -1;
	private layoutQueued = false;
	private timers = new Set<ReturnType<typeof setTimeout>>();

	constructor(opts: PanelStackOptions) {
		if (active) {
			throw new Error("Staffa: only one routed S.main() (one with `routes`) can be active at a time");
		}
		active = this;
		this.opts = opts;
		this.compiled = Object.entries(opts.routes).map(([key, draw]) => compileRoute(key, draw));

		// The router consults this guard before any navigation is applied — ours,
		// a link's, browser back/forward, even a direct route.go() by app code —
		// so every panel the change would remove gets its requestClose asked,
		// exactly once, and a veto leaves the URL and the stack untouched (the
		// router holds the route steady while an async guard is pending, and
		// knows the exact history depth to restore on a vetoed popstate). A
		// guard the app registered before mounting keeps working: it is chained
		// in front of ours — an app veto (or redirect) wins without the panels
		// being asked — and handed back when the shell unmounts.
		const appGuard = route.setGuard((to, from) => {
			const outer = appGuard ? appGuard(to, from) : true;
			if (outer === false) return false;
			if (outer === true) return this.checkChange(to);
			return outer.then((ok) => (ok === false ? false : this.checkChange(to)));
		});

		// Commit the stack whenever the URL or its snapshot changes — the initial
		// load, our own navigations, and browser back/forward. Anything that
		// reaches this point has already passed the guard above.
		A(() => {
			const target = this.computeTarget();
			A.peek(() => this.propose(target));
		});

		this.interceptLinks();
		this.watchTitle();

		A.clean(() => {
			for (const t of this.timers) clearTimeout(t);
			this.timers.clear();
			route.setGuard(appGuard);
			if (active === this) active = null;
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
	 * The one derivation rule for origin-less navigation (§2.8): probe every
	 * prefix of the path against the route table; the matching prefixes become
	 * the stack. Prefixes without a route are simply skipped, so an app that
	 * doesn't want one screen stacked under another just doesn't route that
	 * prefix. The path itself is always the top panel, matched or not.
	 */
	deriveStack(path: string): string[] {
		const segments = splitPath(path);
		const stack: string[] = [];
		for (let i = 1; i < segments.length; i++) {
			const prefix = "/" + segments.slice(0, i).join("/");
			if (this.matches(prefix)) stack.push(prefix);
		}
		stack.push(normalizePath(path));
		return stack;
	}

	/** The stack a route implies: its snapshot topped by its path, or — without a snapshot — derived. */
	private targetFor(path: string, snapshot: unknown): string[] {
		if (Array.isArray(snapshot)) return snapshot.map(String).concat(normalizePath(path));
		return this.deriveStack(path);
	}

	/** The stack the current history entry asks for. Subscribes to path + snapshot. */
	private computeTarget(): string[] {
		return this.targetFor(route.current.path, route.current.state.panels);
	}

	/**
	 * The route guard (see `route.setGuard` in the constructor): asked before any
	 * route change lands, wherever it came from. Runs the {@link Page.requestClose}
	 * guard of every panel the new route's stack would remove — a set defined by
	 * the target (the commit reconciles by path), so a derived stack that shares
	 * nothing with the live one still asks exactly the panels that are closing.
	 */
	private checkChange(to: route.Route): boolean | Promise<boolean> {
		const removed = this.removedBy(this.targetFor(to.path, to.state.panels));
		return removed.length ? runGuards(removed) : true;
	}

	// ── Commit pipeline ────────────────────────────────────────────────────

	private paths(): string[] {
		return this.live.map((e) => e.path);
	}

	/** The live panels a target stack drops — by path, so a splice removes only its own column. */
	private removedBy(target: string[]): PanelEntry[] {
		return this.live.filter((entry) => !target.includes(entry.path));
	}

	/**
	 * Adopt a stack proposed by the URL. Close guards have already been run (and
	 * have passed) by the time a route change is visible here — `checkChange` is
	 * consulted by the router itself, before anything is applied.
	 */
	private propose(target: string[]): void {
		if (sameStack(this.paths(), target)) return;
		this.commit(target, A.peek(route.current, "nav"));
	}

	/**
	 * Apply a target stack: unmount what's gone, mount what's new, animate the
	 * difference.
	 *
	 * Reconciliation is BY PATH (a stack can't hold the same path twice, so that's
	 * well-defined): a panel present in both stacks stays mounted *even if its
	 * index shifted*, which is what lets a panel be spliced out of the middle
	 * (§7) without disturbing the columns above it. A common-prefix diff would
	 * remount every one of them, throwing away exactly the scroll and form state
	 * rule 5 promises to keep.
	 */
	private commit(target: string[], nav: string): void {
		const existing = new Map(this.live.map((entry) => [entry.path, entry]));
		const next: PanelEntry[] = [];
		for (const path of target) {
			const kept = existing.get(path);
			if (kept) {
				// Retained: it just takes its new place in the stack. Its `order` (the
				// DOM sort key) deliberately stays put — see PanelEntry.order.
				existing.delete(path);
				next.push(kept);
				continue;
			}
			const entry = this.createEntry(path, next.length);
			// An initial load just appears, and so do panels *revealed* by a back —
			// they belong underneath the ones sliding away. Everything else enters at
			// the right edge, a replacement exactly like a push.
			if (nav !== "load" && nav !== "back") entry.enter = true;
			next.push(entry);
			this.byId.set(entry.id, entry);
		}
		// Whatever the target no longer holds leaves the same way: fading out over
		// the right edge, which is also where its replacement (if any) comes in from.
		for (const entry of existing.values()) this.beginClose(entry);
		this.live = next;

		A.merge(this.$state, { paths: this.paths(), topId: this.live.length ? this.live[this.live.length - 1].id : 0 });
		for (const entry of this.live) this.$ids[String(entry.id)] = entry.order;
		this.scheduleLayout();
	}

	private createEntry(path: string, order: number): PanelEntry {
		const { draw, params } = this.resolve(path);
		const entry = {
			id: this.nextId++,
			order,
			path,
			draw,
			$ui: A.proxy({ holding: false }),
			layout: "medium" as const,
			width: 0,
		} as PanelEntry;
		// `close` closes *this* panel, top of the stack or not. It resolves the
		// panel's current depth at call time, so it keeps working after a splice has
		// moved it — and quietly resolves false once the panel is gone.
		entry.$page = A.proxy({
			params,
			path,
			close: () => this.closePanelAt(this.live.indexOf(entry)),
		}) as Page<any>;
		return entry;
	}

	/**
	 * Start a panel's exit: it lingers in the DOM, inert and fading, and is dropped
	 * only when the fade itself ends. Removing it on a fixed timer instead would
	 * race the transition — pull the element a frame early and the panel appears to
	 * fade half-way and then vanish. The timeout is just a fallback for when no
	 * `transitionend` is coming at all (transitions off, or an element that never
	 * got placed).
	 */
	private beginClose(entry: PanelEntry): void {
		entry.closing = true;
		const el = entry.el;
		const drop = () => {
			if (!this.byId.has(entry.id)) return;
			this.byId.delete(entry.id);
			delete this.$ids[String(entry.id)];
		};
		if (el) {
			el.classList.add("s-panel-closing");
			el.setAttribute("inert", "");
			el.addEventListener("transitionend", (e: TransitionEvent) => {
				if (e.target === el && e.propertyName === "opacity") drop();
			});
		}
		const timer = setTimeout(() => {
			this.timers.delete(timer);
			drop();
		}, PANEL_MS + 80);
		this.timers.add(timer);
	}

	// ── Navigation ─────────────────────────────────────────────────────────

	/**
	 * Navigate back to a stack that is a truncation of the current one — the shared
	 * implementation of Escape, a page closing itself, return-links and
	 * `S.panels.close()`. `route.back()` prefers the history entry where that
	 * panel was on top (with its scroll state intact); when there is no such entry
	 * it replaces the current one, carrying the snapshot passed as the fallback.
	 * Either way the route guard asks the closing panels first, and the returned
	 * promise reports its verdict.
	 */
	private goBackTo(target: string[]): Promise<boolean> {
		return route.back({ path: target[target.length - 1] }, { state: { panels: target.slice(0, -1) } });
	}

	/** Close every panel above `index` (guarded). Resolves `false` when vetoed. */
	closeDownTo(index: number): Promise<boolean> {
		if (index < 0 || index >= this.live.length - 1) return Promise.resolve(false);
		return this.goBackTo(this.paths().slice(0, index + 1));
	}

	/** Guarded close of the top panel. */
	closeTop(): Promise<boolean> {
		return this.closeDownTo(this.live.length - 2);
	}

	/**
	 * Guarded close of the panel at `index`, top of the stack or not — what a
	 * page's own close affordances ({@link Page.close}, a box's ✕) come down to.
	 *
	 * The top panel pops back to the snapshot beneath it. Any other panel is
	 * *spliced* out: its guard runs, the columns above it keep their place and
	 * state (the commit reconciles by path), and the URL doesn't change, since the
	 * top panel didn't. That still gets its own history entry, so the browser's
	 * back button restores the closed column like any other snapshot — which is
	 * why it goes through `route.go` here rather than through `navigate()`, whose
	 * "link to the panel we're already on" check would see a no-op.
	 */
	closePanelAt(index: number): Promise<boolean> {
		if (index < 0 || index >= this.live.length) return Promise.resolve(false);
		if (index === this.live.length - 1) return this.closeTop();
		const target = this.paths().filter((_, i) => i !== index);
		return Promise.resolve(route.go({
			path: target[target.length - 1],
			// The top panel keeps its search params and hash: it isn't going
			// anywhere, and `go()` would otherwise default them away.
			search: A.peek(() => ({ ...route.current.search })),
			hash: A.peek(route.current, "hash"),
			state: { panels: target.slice(0, -1) },
		}));
	}

	/** Guarded close of whichever panel `path` is open as. False when it isn't open. */
	closeByPath(path: string): Promise<boolean> {
		const wanted = normalizePath(path);
		return this.closePanelAt(this.live.findIndex((entry) => entry.path === wanted));
	}

	/** Guarded close of the panel whose `.s-panel` element this is. */
	closePanelEl(el: HTMLElement): Promise<boolean> {
		return this.closePanelAt(this.live.findIndex((entry) => entry.el === el));
	}

	/**
	 * Navigate to `href`. `originIndex` is the depth of the panel the link lives
	 * in (−1 when it has none — a nav item or a programmatic call, which derives
	 * the whole stack instead). `replace` swaps the originating panel rather than
	 * stacking on top of it.
	 */
	navigate(href: string, originIndex: number, replace = false): void {
		let url: URL;
		try { url = new URL(href, location.href); } catch { return; }
		const path = normalizePath(url.pathname);
		const search = Object.fromEntries(new URLSearchParams(url.search));
		const hash = url.hash;

		// A link to a panel that is already open is a return, not a navigation —
		// so a stack can never hold the same path twice.
		const open = this.live.findIndex((e) => e.path === path);
		if (open >= 0 && open < this.live.length - 1) { void this.closeDownTo(open); return; }
		if (open >= 0) {
			// The target is the panel we're already on. Going nowhere — but the link
			// may still carry a different search or hash, which belong to the top
			// panel: record that as a history entry, leaving the stack alone (the
			// panel reconciles by path, so it isn't even redrawn).
			if (url.search === location.search && (url.hash || "") === (location.hash || "")) return;
			route.go({ path, search, hash, state: { panels: this.paths().slice(0, -1) } });
			return;
		}

		// Without an originating panel there is no stack to build on, so derive
		// one — a nav click and a deep link to the same URL land identically.
		// The route guard (checkChange) asks every panel this removes — a set
		// defined by the target stack, wherever those panels happen to sit —
		// before the change is applied; a veto leaves everything untouched.
		const beneath = originIndex < 0
			? this.deriveStack(path).slice(0, -1)
			: this.paths().slice(0, replace ? originIndex : originIndex + 1);
		route.go({ path, search, hash, state: { panels: beneath } });
	}

	/** Programmatic push/replace, with the top panel as the implied origin. */
	pushPath(path: string, replace: boolean): void {
		this.navigate(path, this.live.length - 1, replace);
	}

	// ── Link interception ──────────────────────────────────────────────────

	/**
	 * Link handling through `route.interceptLinks()`, whose handler hook hands us
	 * the anchor so we can decide what the click *means*: the originating
	 * `.s-panel` (which decides what the click truncates), `data-panel=replace`,
	 * and return-to-an-open-panel semantics. The exclusion rules (targets,
	 * downloads, modified clicks, external URLs) live in Aberdeen; the close
	 * guards run in `checkChange` when our navigation reaches the router.
	 */
	private interceptLinks(): void {
		route.interceptLinks((url, anchor) => {
			const panel = anchor.closest<HTMLElement>(".s-panel");
			const originIndex = panel ? this.live.findIndex((entry) => entry.el === panel) : -1;
			this.navigate(url.href, originIndex, anchor.getAttribute("data-panel") === "replace");
			return true;
		});
	}

	// ── document.title ─────────────────────────────────────────────────────

	/** `"<page title> · <app title>"`, kept in sync with the top panel. */
	private watchTitle(): void {
		const original = document.title;
		A(() => {
			const entry = this.byId.get(this.$state.topId);
			const pageTitle = entry?.$page.title;
			const appTitle = typeof this.opts.title === "string" ? this.opts.title : undefined;
			const title = pageTitle && appTitle ? `${pageTitle} · ${appTitle}` : pageTitle || appTitle;
			if (title) document.title = title;
		});
		A.clean(() => { document.title = original; });
	}

	// ── Rendering ──────────────────────────────────────────────────────────

	/**
	 * Draw the panel viewport into the current element. Called by `main()`.
	 *
	 * There is deliberately no close chrome here — no back rail, no ←: pages
	 * provide their own way out (see {@link Page.close} and `S.box`'s `close`
	 * option). The shell contributes Escape and the browser's own back button.
	 */
	drawStack(): void {
		const container = A("div.s-panels role=main", () => {
			A.onEach(
				this.$ids,
				(_order, id) => this.drawPanel(Number(id)),
				(order, id) => [order, Number(id)],
			);
		}) as HTMLElement;

		this.containerEl = container;
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

	private drawPanel(id: number): void {
		const entry = this.byId.get(id);
		if (!entry) return;

		const el = A("section.s-panel", () => {
			const contentEl = A("div.s-content", () => {
				entry.draw(entry.$page);
				// After the content, so there is something to scroll when restoring.
				route.persistScroll(entry.path);
			}) as HTMLElement;
			watchVerticalOverflow(contentEl);

			// The loading hint, in its own scope so flipping the flag doesn't
			// redraw the panel's content. Held-back panels show nothing yet: they
			// are still parked off screen, waiting to slide in with real content.
			A(() => {
				if (!entry.$page.loading || entry.$ui.holding) return;
				A("div.s-panel-loading aria-hidden=true", () => { A("i"); A("i"); A("i"); });
			});
		}) as HTMLElement;

		// How much room the panel wants, settled right after its handler's
		// synchronous run — deliberately once: a column that changed its mind
		// later would reflow itself and shove its neighbours around.
		const asked = A.peek(entry.$page, "layout");
		entry.layout = asked === "small" || asked === "large" ? asked : "medium";

		entry.el = el;
		// Nothing animates from the arbitrary initial position; `layout()` gives
		// the panel its real geometry (and turns transitions back on) in the
		// upcoming frame, before anything is painted. A redraw (a reactive
		// dependency inside the handler) lands here too, with a brand-new element
		// that has to be placed again before it may animate.
		entry.placed = false;
		el.style.transition = "none";
		A.clean(() => { if (entry.el === el) entry.el = undefined; });

		// A held-back panel that finishes loading gets to play its enter animation.
		A(() => {
			void entry.$page.loading;
			this.scheduleLayout();
		});

		this.scheduleLayout();
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
	 * Size and position every panel, and publish the width of the whole ensemble
	 * (sidebar + separator + columns) for the shell to centre itself on.
	 *
	 * This is everything CSS can't work out for itself: which panels exist, which
	 * of them are visible, how wide each one is and where it sits. All the motion
	 * between two of these arrangements is CSS's job.
	 */
	private layout(): void {
		const container = this.containerEl;
		const inner = container?.parentElement;
		const body = inner?.parentElement;
		const shell = container?.closest<HTMLElement>(".s-main");
		if (!container || !inner || !body || !shell) return;
		const n = this.live.length;
		// A panel that hasn't drawn yet has no width to contribute, which would make
		// this pass's arithmetic (and any enter animation it triggers) meaningless.
		// Every mount schedules another pass, so simply wait for it.
		if (!n || this.live.some((entry) => !entry.el)) return;

		// Measured on the *shell*, not on the region: the region's width is this
		// function's own output, so reading it back would nail the layout to
		// whatever it happened to be a frame ago. Fractional widths throughout — a
		// rounded column edge would drift a pixel away from the chrome above it.
		const total = body.getBoundingClientRect().width;
		if (!total) return;

		const stacking = this.opts.stacking !== false;

		// A window resize (or the very first pass) must be adopted instantly —
		// geometry tracking the window through a 450ms transition reads as lag,
		// and a shell animating itself into place on load reads as a glitch.
		// `.s-shell-snap` suppresses every standing transition for this one pass.
		const snap = this.lastBodyW !== total;
		if (snap) {
			this.lastBodyW = total;
			shell.classList.add("s-shell-snap");
		}

		// Everything that sits beside the columns: the sidebar and its hairline,
		// either of which may be display:none on a narrow shell.
		let chrome = 0;
		for (const child of inner.children) {
			if (child !== container) chrome += child.getBoundingClientRect().width;
		}

		// The standard page is SHELL_PX wide, capped by the window; what it leaves
		// beside the sidebar is the *standard* content area. Widths are a pure
		// function of the window — never of what else is open — so a panel NEVER
		// resizes because a neighbour came or went; only a window resize (the
		// snap pass above) changes them:
		// - "medium" fills the standard content area exactly;
		// - "small" is half of it (minus the gutter) whenever that half is still
		//   a usable column, and the whole of it on narrower screens;
		// - "large" ignores the standard width and takes everything the window
		//   has — which also means nothing ever fits beside it.
		const stdRoom = Math.max(0, Math.min(SHELL_PX, total) - chrome);
		const fullRoom = Math.max(0, total - chrome);
		const halfW = (stdRoom - GUTTER_PX) / 2;
		const smallW = halfW >= PAIR_MIN_PX ? halfW : stdRoom;
		const width = (entry: PanelEntry) =>
			entry.layout === "small" ? smallW : entry.layout === "large" ? fullRoom : stdRoom;

		// The visible run: as many top-of-stack panels as the window fits, at the
		// sizes the window gives them. The top panel always shows.
		let first = n - 1;
		let runSum = width(this.live[first]);
		if (stacking) {
			for (let i = n - 2; i >= 0; i--) {
				const sum = runSum + GUTTER_PX + width(this.live[i]);
				if (sum > fullRoom) break;
				runSum = sum;
				first = i;
			}
		}

		// The content area holds the run, but is never smaller than the standard
		// page (a lone small leaves its other half open — which is exactly where
		// the next small lands, without anything on screen moving) and never
		// wider than the window. So the page is the familiar 1280px until extra
		// columns genuinely fit, and stretches — centred — to hold the ones that
		// do; with a "large" up that's the window's edges.
		const area = Math.min(fullRoom, Math.max(stdRoom, runSum));

		for (let i = first; i < n; i++) this.live[i].width = width(this.live[i]);
		// Panels that have never been visible get their would-be width too, so a
		// reveal doesn't start from nothing.
		for (const entry of this.live) {
			if (!entry.width) entry.width = width(entry);
		}

		// The chrome above and below the body caps itself to the ensemble width,
		// keeping everything centred and aligned however far the area stretches.
		// The consumers transition their max-width (see main.ts), so the
		// recentring plays along with the panel that caused it instead of
		// snapping.
		shell.style.setProperty("--s-shell-w", `${chrome + area}px`);

		// Phase 1 — every panel's *start* state for this frame. Panels already on
		// screen simply move (their standing transition animates it); freshly
		// mounted ones still have transitions switched off, so what we set here is
		// adopted instantly and becomes the "before" of their enter animation.
		const fresh: PanelEntry[] = [];
		let x = 0;
		for (let i = 0; i < n; i++) {
			const entry = this.live[i];
			const el = entry.el!;
			const shown = i >= first;
			// Visible panels are left-aligned in the content area, a gutter apart;
			// hidden ones park at its left edge, keeping their last width.
			place(el, shown ? x : 0, entry.width);
			if (shown) x += entry.width + GUTTER_PX;
			el.classList.toggle("s-panel-sep", shown && i > first);
			// Hidden panels fade out over the left edge and, once faded, stop being
			// rendered at all — but they keep their DOM, and their scroll position.
			el.classList.toggle("s-panel-hidden", !shown);
			el.toggleAttribute("inert", !shown);
			if (entry.placed) continue;
			fresh.push(entry);
			// A panel that mounts while still fetching holds here for a moment, so
			// it can enter with real content instead of an empty column.
			if (!A.peek(entry.$page, "loading") || entry.holdDone) entry.$ui.holding = false;
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

/** Put a panel at rest: `x` from the region's left edge, `width` pixels wide. */
function place(el: HTMLElement, x: number, width: number): void {
	el.style.left = `${x}px`;
	el.style.width = `${width}px`;
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * Ask every panel being removed, deepest first, whether it may go. Returns a
 * plain boolean when no guard needs awaiting, so the common case stays
 * synchronous (and screenshots stay deterministic).
 */
function runGuards(removed: PanelEntry[]): boolean | Promise<boolean> {
	const list = [...removed].reverse();
	let i = 0;
	const step = (): boolean | Promise<boolean> => {
		while (i < list.length) {
			const guard = A.peek(list[i++].$page, "requestClose");
			if (!guard) continue;
			let verdict: boolean | Promise<boolean>;
			try {
				verdict = guard();
			} catch (e) {
				console.error(e);
				return false;
			}
			if (verdict === false) return false;
			if (verdict !== true) return Promise.resolve(verdict).then((ok) => (ok === false ? false : step()));
		}
		return true;
	};
	return step();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sameStack(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

function drawDefaultNotFound($page: Page<{}>): void {
	A("p fg:$s-muted", () => A("#", `No page at ${$page.path}`));
}

/**
 * Toggle `.s-scroll-y` on `el` whenever a vertical scrollbar is eating into its
 * width, so CSS can inset the bar from the panel's edge. Same trick (and the
 * same reasoning) as content mode's `watchVerticalOverflow` in main.ts.
 */
function watchVerticalOverflow(el: HTMLElement): void {
	if (typeof ResizeObserver === "undefined") return;
	const update = () => el.classList.toggle("s-scroll-y", el.offsetWidth > el.clientWidth);
	const ro = new ResizeObserver(update);
	ro.observe(el);
	if (el.firstElementChild) ro.observe(el.firstElementChild);
	update();
	A.clean(() => ro.disconnect());
}

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Navigating the routed `S.main()` shell from code, for the times it isn't a
 * link click, such as opening the screen for a record you just created.
 *
 * The same rules as a link click apply: pushing a path that is already open
 * goes back to it rather than opening it twice, and anything that would close a
 * panel asks its {@link Page.requestClose} first.
 *
 * @example
 * ```ts
 * S.button({ content: "New task", click: async () => {
 *   const task = await createTask();
 *   S.panels.push(`/tasks/${task.id}`);
 * }});
 * ```
 */
export const panels = {
	/** Opens `path` in a new panel on top of the top one. */
	push(path: string): void {
		requireActive().pushPath(path, false);
	},
	/**
	 * Opens `path` in place of the top panel, which closes (asking its
	 * {@link Page.requestClose} first). The panels beneath it stay as they are.
	 */
	replace(path: string): void {
		requireActive().pushPath(path, true);
	},
	/**
	 * Closes the top panel, or, given a `path`, whichever panel is open at it,
	 * asking {@link Page.requestClose} first. A panel that isn't on top is taken
	 * out on its own, leaving the columns to its right exactly as they are.
	 *
	 * Resolves `false` if the panel didn't close: `requestClose` said no, `path`
	 * isn't open, or another navigation got there first.
	 */
	close(path?: string): Promise<boolean> {
		const ctl = requireActive();
		return path == null ? ctl.closeTop() : ctl.closeByPath(path);
	},
	/** The paths of the open panels, oldest first. Reactive: safe to read in a scope. */
	get stack(): readonly string[] {
		return active ? active.$state.paths : [];
	},
};

function requireActive(): PanelController {
	if (!active) throw new Error("Staffa: S.panels needs a routed S.main() (one with `routes`) to be mounted");
	return active;
}

/**
 * Closes the panel `el` sits in, working out which one that is from the DOM.
 * That is what lets a close button work without being handed a `$page`, from
 * any column, whether or not it is on top. Used by `S.box`'s `close: true`.
 *
 * Outside a routed shell (or outside any panel, such as a box in a dialog) there is
 * nothing to close: it warns and resolves `false`.
 */
export function closeContainingPanel(el: Element | null | undefined): Promise<boolean> {
	const panelEl = el?.closest<HTMLElement>(".s-panel");
	if (!active || !panelEl) {
		console.warn("Staffa: `close: true` needs to be drawn inside a panel of a routed S.main()");
		return Promise.resolve(false);
	}
	return active.closePanelEl(panelEl);
}

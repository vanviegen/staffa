import A from "aberdeen";
import type { Slot } from "./core.js";

/**
 * Keyboard shortcuts: a registry of live bindings served by one document-level
 * `keydown` listener, and writing a combination back out the way this platform
 * writes it. The spelling of a combination is documented on {@link bindKey}.
 */

/**
 * Whether this is an Apple platform, where the modifier is ⌘ rather than Ctrl.
 * `platform` is deprecated but frozen rather than removed, and the user agent
 * behind it says Macintosh anyway — an iPad asking for the desktop site
 * included, which is the right answer here.
 */
const IS_APPLE = typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

/** Spellings people reach for that aren't `KeyboardEvent.key` values. */
const ALIASES: Record<string, string> = { esc: "escape", space: " " };

/** How a key is written in a hint, where its canonical name won't do. */
const GLYPHS: Record<string, string> = { " ": "Space", escape: "Esc", arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→" };

/** One registered shortcut, as {@link getActiveKeyBindings} hands them out. */
export interface KeyBinding {
	/**
	 * What it does — a rich-text string or draw function, shown in the shortcut
	 * overview. Without one, the binding stays out of the overview.
	 */
	description?: Slot;
	/**
	 * Runs on the keystroke, after `preventDefault()`. Without one, the binding
	 * only *describes* the key (which is handled elsewhere) — it is listed and
	 * shadows same-key bindings further out, but the keystroke passes untouched.
	 */
	press?: (e: KeyboardEvent) => void;
	/** Keeps working while a modal owns the keyboard. */
	global?: boolean;
	/** The same-key binding this one shadows, restored when this one is removed. */
	prev?: KeyBinding;
}

/**
 * Live bindings, kept per element per canonical key string. The element a
 * binding is stored at decides when it applies: the keydown handler walks up
 * the tree from the focused element and takes the first match.
 */
const bindings = new WeakMap<Element, Map<string, KeyBinding>>();

/** Elements that claimed the keyboard, in claiming order. The last one rules. */
const modalStack: Element[] = [];

/**
 * Give the current element the keyboard, until the returned release function is
 * called: normal bindings drawn inside it register at it, so they die with it
 * and never fire once focus (and the walk up from it) has moved to a later
 * claim — while bindings from outside any claim are silenced, the `global`
 * ones excepted. What a modal dialog does while it is up.
 */
export function claimKeyboard(): () => void {
	const el = A() as Element | undefined;
	if (!el) throw new Error("Staffa: claimKeyboard needs a current element");
	modalStack.push(el);
	return () => {
		const i = modalStack.indexOf(el);
		if (i >= 0) modalStack.splice(i, 1);
	};
}

/**
 * A spec reduced to its canonical form, the registry's index — simply the spec
 * lower-cased, aliases resolved: an optional `mod+`, an optional `shift+`,
 * then the `KeyboardEvent.key` value. Throws on anything else, loudly: a
 * shortcut is invisible until it fails to fire, so a typo must not wait for
 * the keystroke that needed it.
 */
function canonKey(spec: string): string {
	const [, mod, shift, name] = /^(mod\+)?(shift\+)?(.*)$/i.exec(spec)!;
	let key = name.toLowerCase();
	key = ALIASES[key] ?? key;
	if (!key || (key.length > 1 && /[-+]/.test(key))) {
		throw new Error(`Staffa: can't parse key "${spec}" — write "k", "f2", "mod+k" or "mod+shift+f2"`);
	}
	// The typed character is a combination's one name: `?` is what shift-/ types.
	if (shift && key.toUpperCase() === key) {
		throw new Error(`Staffa: "${spec}" — write the shifted character itself ("?", not "shift+/")`);
	}
	return (mod ? "mod+" : "") + (shift ? "shift+" : "") + key;
}

/** The canonical key string for a keystroke, or `null` for one that can't be a shortcut. */
function canonEvent(e: KeyboardEvent): string | null {
	// Alt is never bound, nor is Ctrl on a Mac: a keystroke holding one down
	// belongs to the app, the browser or the OS — not to us.
	if (e.altKey || (IS_APPLE ? e.ctrlKey : e.metaKey)) return null;
	const key = e.key.toLowerCase();
	// Shift counts only where it doesn't already shape the typed character: it
	// turns k into K and holds during F2, but *is* the difference between / and
	// ? — and Caps Lock's capitals don't register.
	const shift = e.shiftKey && (key.length > 1 || e.key.toUpperCase() !== key);
	return ((IS_APPLE ? e.metaKey : e.ctrlKey) ? "mod+" : "") + (shift ? "shift+" : "") + key;
}

/**
 * Whether the focused element keeps this keystroke for itself: anything being
 * typed into keeps the unmodified keys (Escape excepted — it never types), a
 * button-like control keeps its activation keys, and a link keeps Enter even
 * modified — that one is the keyboard's own open-in-a-new-tab, the counterpart
 * of a ctrl-click. The one answer the matcher and the `?` overview share, so
 * what is listed and what fires can never disagree.
 */
function keptByTarget(keyStr: string, target: Element | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const mod = keyStr.startsWith("mod+");
	// Modifiers stripped: a shifted Enter is still the link's new-window Enter.
	const key = keyStr.replace(/^(mod\+)?(shift\+)?/, "");
	if (key === "enter" && target.closest("a[href]") != null) return true;
	if (!mod && (key === "enter" || key === " ") && target.closest("button, summary, [role=button]") != null) return true;
	const tag = target.tagName;
	return !mod && key !== "escape" &&
		(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable);
}

/** Whether a binding found at `el` applies, given the current keyboard claim. */
function reachable(el: Element, b: KeyBinding): boolean {
	const modal = modalStack[modalStack.length - 1];
	return b.global === true || !modal || modal.contains(el);
}

/** The innermost claiming element containing `el`, if any. */
function claimFor(el: Element): Element | undefined {
	for (let i = modalStack.length - 1; i >= 0; i--) {
		if (modalStack[i].contains(el)) return modalStack[i];
	}
}

/** The element whose claim owns the keyboard right now: the top claim, or the body. */
export function keyboardOwner(): Element {
	return modalStack[modalStack.length - 1] ?? document.body;
}

/**
 * Where the binding search starts: the focused element — or the claiming modal
 * itself when focus has strayed outside it (a dialog holding nothing
 * focusable, a click that blurred to the body), so a modal never loses its own
 * keys.
 */
function walkStart(target: Element | null): Element {
	const modal = modalStack[modalStack.length - 1];
	return modal && !(target && modal.contains(target)) ? modal : target ?? document.body;
}

let listening = false;

function onKeydown(e: KeyboardEvent): void {
	// Something already answered for this keystroke — a handler of the app's own,
	// a menu's or an autocomplete's; element listeners run before this one.
	if (e.defaultPrevented || e.repeat || e.isComposing) return;
	const keyStr = canonEvent(e);
	const target = e.target instanceof Element ? e.target : null;
	if (keyStr == null || keptByTarget(keyStr, target)) return;
	for (let el: Element | null = walkStart(target); el; el = el.parentElement) {
		const b = bindings.get(el)?.get(keyStr);
		if (b && reachable(el, b)) {
			// A describe-only binding still ends the search: the key is somebody
			// else's, and the keystroke passes untouched.
			if (b.press) {
				e.preventDefault();
				b.press(e);
			}
			return;
		}
	}
}

/**
 * What a keypress aimed at `target` — the focused element, typically — could do
 * right now: for each combination, the binding the walk up from `target` would
 * find, minus the keystrokes `target` keeps for itself. Innermost first, as
 * `[keyStr, binding]` pairs. A snapshot, not reactive.
 */
export function getActiveKeyBindings(target: Element | null): Array<[string, KeyBinding]> {
	const found = new Map<string, KeyBinding>();
	for (let el: Element | null = walkStart(target); el; el = el.parentElement) {
		const map = bindings.get(el);
		if (map) {
			for (const [keyStr, b] of map) {
				if (!found.has(keyStr) && reachable(el, b) && !keptByTarget(keyStr, target)) found.set(keyStr, b);
			}
		}
	}
	return [...found];
}

/**
 * Bind a keyboard shortcut, for as long as the calling scope lives.
 *
 * **The spec** is a `KeyboardEvent.key` value — `"k"`, `"f2"`, `"escape"`
 * (`"esc"`), `"space"`, `"arrowdown"`, a bare `"?"` — optionally prefixed by
 * `mod+` (⌘ on a Mac, Ctrl elsewhere) and/or `shift+`, in that order:
 * `"mod+k"`, `"shift+f2"`, `"mod+shift+b"`. Case doesn't matter. A character
 * Shift itself types is written as that character — `"?"`, never `"shift+/"` —
 * so a combination works on every keyboard layout. No other modifiers are
 * offered: Alt and the ⊞ key belong to the browser and the OS, which also
 * keep some `mod` combinations for themselves — T, N, W, Q and the digits
 * among them, while K, B, E, `/` and `.` are safely yours. Everything Staffa
 * takes a `key` option is spelled this way, and {@link formatKey} turns it
 * back into `"⇧⌘K"`/`"Ctrl+Shift+K"`.
 *
 * `description` is what the shortcut overview (see {@link showKeyHelp}) lists
 * the binding as — a rich-text string or draw function; without one the
 * binding stays out of the overview. Omit `press` to merely *describe* a key
 * your app handles by other means, so the overview can still tell the user
 * about it.
 *
 * A handler of the app's own that ran `preventDefault()` first always wins,
 * and keystrokes the focused element owns (typing into a field, Enter on a
 * link) are left to it. Otherwise `mode` says who else can reach the binding:
 *
 * - `"normal"` (the default): works app-wide, but is silenced while a modal
 *   dialog from outside it is up. Binding the same combination again shadows
 *   the earlier binding until the new scope dies — so a state can take a key
 *   over temporarily.
 * - `"global"`: keeps working even over a modal.
 * - `"local"`: only fires while the keyboard focus is inside the current
 *   element — for a shortcut that belongs to one row or panel of many.
 * - an `Element`: like `"local"`, but for that element rather than the
 *   current one.
 *
 * @example
 * ```ts
 * S.bindKey("mod+k", "Search", openSearch);
 * S.bindKey("mod+z", "Undo");   // describe only: handled by our own listener
 * ```
 */
export function bindKey(spec: string, description?: Slot, press?: (e: KeyboardEvent) => void, mode: "normal" | "global" | "local" | Element = "normal"): void {
	const cur = A() as Element | undefined;
	// A normal binding is anchored by containment, not by whatever claim is top
	// at call time: a scope redrawn elsewhere while a dialog is up must not
	// hitch its keys to that dialog and die with it.
	const el = mode === "global" ? document.body
		: mode === "local" ? cur
		: mode === "normal" ? (cur && claimFor(cur)) ?? document.body
		: mode;
	if (!el) throw new Error("Staffa: a local key binding needs a current element");
	const keyStr = canonKey(spec);
	let map = bindings.get(el);
	if (!map) bindings.set(el, map = new Map());
	// Shadow (not replace) any same-key binding already at this element; the
	// scope's cleanup below restores it.
	const binding: KeyBinding = { description, press, global: mode === "global", prev: map.get(keyStr) };
	map.set(keyStr, binding);
	if (!listening) {
		listening = true;
		document.addEventListener("keydown", onKeydown);
	}
	A.clean(() => {
		// Unlink, wherever in the shadow chain the binding sits by now.
		let b = map.get(keyStr);
		if (b === binding) {
			if (binding.prev) map.set(keyStr, binding.prev);
			else map.delete(keyStr);
		} else {
			for (; b; b = b.prev) {
				if (b.prev === binding) { b.prev = binding.prev; break; }
			}
		}
	});
}

/**
 * Write a key combination the way the platform writes it: `"⇧⌘K"` on a Mac,
 * `"Ctrl+Shift+K"` everywhere else. What the components put in their key hints —
 * use it for the same hint elsewhere in your app, so both spell the shortcut the
 * way this machine's user expects. Pass `aria: true` for the `aria-keyshortcuts`
 * spelling instead: full modifier names and real key names,
 * `"Meta+Shift+K"`/`"Control+Shift+K"`.
 *
 * @example
 * ```ts
 * S.button({ content: `Search  ${S.formatKey("mod+k")}`, click: search });
 * ```
 */
export function formatKey(spec: string, aria = false): string {
	const keyStr = canonKey(spec);
	const mod = keyStr.startsWith("mod+");
	const rest = mod ? keyStr.slice(4) : keyStr;
	const shift = rest.startsWith("shift+");
	const key = shift ? rest.slice(6) : rest;
	const cap = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1);
	if (aria) {
		const name = key === " " ? "Space" : shift || key.length > 1 ? cap : key;
		return (mod ? (IS_APPLE ? "Meta+" : "Control+") : "") + (shift ? "Shift+" : "") + name;
	}
	// Apple writes ⇧ before ⌘, and nothing between the glyphs.
	const name = GLYPHS[key] ?? cap;
	return IS_APPLE
		? (shift ? "⇧" : "") + (mod ? "⌘" : "") + name
		: (mod ? "Ctrl+" : "") + (shift ? "Shift+" : "") + name;
}

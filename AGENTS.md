# Skye — agent & contributor guide

Skye is a small, opinionated **component library for [Aberdeen](https://aberdeenjs.org)**,
the fine-grained reactive UI library. This document explains the philosophy and
the conventions every component follows, so you can extend the library without
re-deriving the design from scratch.

If you're new to Aberdeen, skim the `aberdeen` skill / docs first. The one-liner:
Aberdeen builds DOM by calling `A(...)`, tracks reads of `A.proxy(...)` objects,
and re-runs the *smallest enclosing* `A(() => ...)` scope when a read value
changes. No virtual DOM, no diffing — you choose the update granularity by where
you read reactive data.

## What a Skye component *is*

> A component is just a plain function that takes **one typed options object**
> and draws DOM via Aberdeen.

```ts
export function button(opts: ButtonOptions | string | Content = {}): void { ... }
```

There are no classes, no web components, no JSX. `S` (the default export) is just
an object collecting these functions, so users write `S.button({...})`.

Components return `void` (they draw as a side effect, like Aberdeen's own
`draw*` functions). Return a value only when there's a genuinely useful handle to
give back.

## The options-type hierarchy

All option types descend from a shared hierarchy in `src/core.ts`. **Reuse it;
don't reinvent these fields per component.**

- **`BaseOptions`** — every component has `root?: Styling`, an Aberdeen
  attr/style string applied to the widget's outermost element. This is the
  universal escape hatch for layout/spacing/extra classes.
- **`ContentOptions extends BaseOptions`** — for components that wrap a single
  block of caller content: `content?: () => void` plus `inner?: Styling` (an
  attr/style string for the element that actually *holds* the children).
- **`FieldOptions extends BaseOptions`** (`src/components/field.ts`) — for form
  controls: `label`, `help`, `error`, `disabled`, `required`, `name`, `id`,
  `control` (styling for the control element). All field components render
  through `drawField()` so labels/help/errors look and align identically.

`Styling` is just `string` — an Aberdeen attr/style/class string like
`"display:flex gap:$3 .my-class"`. `Bindable<T>` is `{ value: T }`, i.e. the
shape of `A.proxy(x)` / `A.ref(obj, key)`.

### Naming conventions for option fields

- `root` → outermost element styling (everywhere).
- `inner` → the children-holding element's styling (content components).
- `content` → the single content draw-function.
- `control` → the actual input/control element styling (field components).
- Sub-region styling is `<region>Inner` (e.g. `headerInner`, `footerInner`,
  `topbarInner`, `actionsInner`).
- A piece of renderable content that's "text or a draw function" is a `Slot`
  (`string | (() => void)`); draw it with `drawSlot()`.

## Reactivity: pragmatic, not maximal

**The options object — or any part of it — may be an Aberdeen proxy.** Users may
mutate options later expecting a partial re-render. But don't over-engineer this:
prefer the simple, readable thing and only isolate a scope where it actually
matters.

The default, simple style is to **pass option strings straight to `A` as
positional args**:

```ts
A("header.S_topbar", opts.topbarInner, () => { ... });
```

Reading `opts.topbarInner` here happens in the *caller's* scope, so if it changes
the `<header>` is recreated. That's totally fine for most elements. Only reach
for a dedicated `A(() => ...)` scope when recreation would be costly or wrong:

- The element is an **`<input>`/`<textarea>`** (recreating loses focus, caret,
  IME state) — so field controls read their dynamic attrs (`disabled`,
  `aria-invalid`, ...) in small scopes (see `applyControlAttrs` in `field.ts`).
- The element **contains lots of content** you don't want to redraw — e.g.
  `box` puts its header/footer in their own scopes so toggling them doesn't
  recreate the body; `main` frames the content sheet in a nested scope so a
  `maxWidth` change doesn't rebuild the whole page.

Use `A.peek(() => ...)` when you need a value but must *not* subscribe.

Rule of thumb: reach for a scope deliberately, with a reason you could write in a
comment — not by default.

## Styling rules

1. **Global CSS at file top level.** Unlike typical Aberdeen code (`insertCss`),
   Skye uses `A.insertGlobalCss({...})` so application authors can override
   anything. Call it **once as a module-level statement** in each component file
   — *never* inside a draw function. `insertGlobalCss` registers its cleanup
   (`delete cssSnippets[n]`) on the *current reactive scope*; if you call it
   during a draw that runs inside a transient scope (e.g. the first time a
   component renders inside a tab panel), switching away tears that scope down
   and **deletes the stylesheet**. At module top level the scope is the
   never-cleaned root scope, so the styles live forever.
2. **Lean on nesting; invent as few classes as possible.** `insertGlobalCss`
   supports nested objects (`&` = the element, a bare key = a descendant). Style
   structural children with **element / structural selectors**, not new classes:
   ```ts
   ".S_check": { "&": "...", "> label": "...", "input": "..." }
   ```
   When you do need a class, prefix it `S_`. Prefer **generic modifier classes
   matched in combination** over per-component ones: a button is
   `.S_btn.S_filled.S_primary`, styled via nested `"&.S_filled"`, `"&.S_primary"`
   — not `S_btn-filled`. Reusable bits like `.S_req`/`.S_help`/`.S_error` are
   shared across field components.
3. **Use Aberdeen's CSS shorthand.** In style strings prefer the short forms:
   `p`/`m`/`r`/`bg`/`fg`/`w`/`h`/`gap`, the spacing scale `$1`..`$12`, and `$var`
   for custom properties (`r:$sRadius`, `bg:$sSurface`). Short form is
   space-delimited with **no** semicolons (`"p:$3 gap:$3 r:$sRadius"`); switch to
   long form (`key: value;`) only for values containing spaces
   (`"border: 1px solid $sBorder; transition: all 0.15s;"`). `$name` expands at
   the start of a value or after a space, so it works inside `color-mix(in srgb,
   $c 20%, transparent)` too.
4. **Theme via CSS custom properties** (defined in `src/theme.ts`). Never
   hard-code a colour/radius/shadow that should be themeable. A handy trick (see
   `button.ts`) is to set a local `--c` per colour role and have the variant
   rules consume it (`$c`), so you avoid writing colour×variant rules.
5. **No outer margins.** Components never put margin on their own outermost
   element — spacing between siblings is the parent's job. Content components
   *do* set a default `padding` + matching `gap` on their **inner** element (in
   CSS, e.g. box's `"> div": "p:$3 gap:$3"`); `opts.inner` is passed as an inline
   arg so it overrides. Add `display:flex` via `inner` if you want flex children.
   Tab panels are the exception: no enclosing box, so no default padding (content
   aligns flush with the tab strip).
6. **Legible at a glance.** Every button variant carries at least a visible
   border (so even the lowest-emphasis `outlined` button reads as a button);
   links are underlined; focus states use a visible ring
   (`box-shadow: 0 0 0 3px $sFocus`). Don't ship an affordance the user can't
   recognise.

The base stylesheet in `theme.ts` is a *light* reset: box-sizing, body
bg/fg/font, link/code styling, focus ring. It deliberately does **not** strip
margins from headings/paragraphs/lists, so rendered rich content (e.g.
markdown-to-HTML) keeps a sane rhythm.

## Convenience shortcuts

Components *may* accept a couple of very common shorthand argument forms in
addition to the full options object. Handle this inline at the top of the
function — it's a one-liner, no helper needed:
```ts
const o: BoxOptions = typeof opts === "function" ? { content: opts } : opts;
```
- A **function** → treated as `content` (e.g. `S.box(() => ...)`).
- A **string** → mapped to a named option (e.g. `S.button("Save")` → `text`).

Keep these to genuinely common cases; the options object is always the full API.

## Accessibility

Use semantic elements first (`<button>`, `<label>`, `<form>`, `<section>`,
`<header>`/`<footer>`, `<main>`). Wire `<label for>` to control `id`s (use
`uniqueId()`). Add ARIA only where semantics fall short — e.g. the tab strip
(`role=tablist`/`tab`/`tabpanel` + roving `tabindex` + arrow keys) and the
autocomplete (`role=combobox`/`listbox`/`option`, `aria-expanded`,
`aria-activedescendant`). Prefer native behaviour (e.g. checkbox uses a real
`<input type=checkbox>` with `accent-color`) over re-implementing it.

## File layout

```
src/
  core.ts                 # option hierarchy + tiny helpers (drawSlot, uniqueId)
  theme.ts                # Theme type, darkTheme/lightTheme proxies, setDarkMode/getDarkMode + base reset CSS
  components/
    field.ts              # FieldOptions, drawField(), applyControlAttrs() — shared form chrome
    main.ts box.ts form.ts
    textline.ts textarea.ts checkbox.ts
    tabs.ts button.ts buttonGroup.ts autocomplete.ts
  index.ts                # assembles `S`, re-exports types
```

Importing `theme.ts` installs the spacing scale, sets up a reactive scope that
merges the active theme (`darkTheme` or `lightTheme`) into `A.cssVars`, and
registers the base reset CSS — all at module load, before the first paint.
Users customize the theme by mutating `S.darkTheme` / `S.lightTheme` directly.

## Adding a new component — checklist

1. Create `src/components/<name>.ts`.
2. Define `<Name>Options` extending the right base (`BaseOptions`,
   `ContentOptions`, or `FieldOptions`). Add full TSDoc on every option.
3. Add a module-level `A.insertGlobalCss({...})` using nesting, theme `$var`s and
   shorthand (see Styling rules 1–4).
4. Implement the draw function: pass `root`/`inner`/`control` straight to `A` as
   positional args; reach for a small `A(() => ...)` scope only where it matters
   (inputs, heavy subtrees — see the Reactivity section). Use semantic HTML and
   ARIA as needed.
5. For form controls, render through `drawField()` and call
   `applyControlAttrs()` so they match the others.
6. Add a TSDoc block with an `@example` on the function itself.
7. Register it in `src/index.ts` (the `S` object + a type re-export).
8. Extend `smoke.mjs` to render it, run `npm run smoke`. Keep `npm run build`
   (i.e. `tsc`) clean.

## Verifying changes

- `npm run typecheck` — must be clean.
- `npm run smoke` — builds, then renders every component in jsdom and checks the
  output (including a reactive-update assertion). Add a check for anything new.

## Reference

`m3e/` is a vendored copy of the Material 3 *web-component* library. It's **only
a last-resort source of inspiration** (e.g. for the ARIA shape of a complex
widget). Skye's API and implementation are entirely different — function calls
that do Aberdeen draws, not web components — so do **not** port its code or API.

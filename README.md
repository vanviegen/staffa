# Staffa

A small, opinionated component library for the
[Aberdeen](https://aberdeenjs.org) reactive UI library.

Staffa components are **plain functions** that draw DOM through Aberdeen — no JSX,
no web components, no build step required. You import a single `S` object and
call its methods:

```ts
import A from "aberdeen";
import S from "staffa";

const $user = A.proxy({ name: "", email: "", subscribe: false });

A.mount(document.body, () => {
  S.main({
    title: "Sign up",
    maxWidth: "40rem",
    content: () => {
      S.form({
        submit: () => console.log("submit", A.unproxy($user)),
        content: () => {
          S.textline({ label: "Name", required: true, bind: A.ref($user, "name") });
          S.textline({ label: "Email", type: "email", bind: A.ref($user, "email") });
          S.checkbox({ label: "Email me updates", bind: A.ref($user, "subscribe") });
        },
        actions: () => S.button({ text: "Create account", type: "submit" }),
      });
    },
  });
});
```

Staffa ships a **dark theme** by default and looks reasonable out of the box.

> **Pre-1.0 notice:** Staffa's API is likely to change fairly often before stabilising as 1.0. That shouldn't stop you from using it — the library is small enough that any breaking changes are easy to adapt to yourself.

## Install

```sh
npm install staffa aberdeen
```

Aberdeen is a **peer dependency** — Staffa builds on your app's single copy of
Aberdeen rather than bundling its own (two copies of Aberdeen would mean two
independent reactivity systems). So install `aberdeen` alongside `staffa`.

Staffa is published as ESM with TypeScript types.

## Components

Every component takes a single typed options object. Common options follow a
consistent naming convention:

| Option         | On                   | Meaning                                                   |
| -------------- | -------------------- | --------------------------------------------------------- |
| `attrs`        | most components      | attr/style string for the outermost element               |
| `content`      | container components | a `() => void` draw function for the children             |
| `contentAttrs` | container components | attr/style string for the element holding the children    |
| `inputAttrs`   | form fields          | attr/style string for the actual input/control element    |
| `<region>Attrs`| where relevant       | sub-region styling, e.g. `headerAttrs`, `footerAttrs`     |
| `label` / `help` / `error` / `disabled` / `required` / `name` | form fields | standard field chrome |

These are all [Aberdeen attr/style strings](https://aberdeenjs.org), e.g.
`"display:flex gap:$3 .my-class"`. (Write `display:flex`, not bare `flex`.) As
`attrs` is applied last, it can also override a component's default surface
classes — pass `".danger"` or `".neutral .outlined"` to recolour a button, etc.

Anywhere a component shows a small piece of text (a `label`, `header`, a button
`text`, a dialog body, ...), you can pass either a **string** — rendered as
[rich text](#rich-text) — or a `() => void` draw function for custom markup.

### Layout & containers

- **`S.main(opts)`** — app shell: sticky top bar (`icon`, `title`, `subtitle`,
  `menu`), a scrollable content area, and a `footer`. Set `maxWidth` to center
  the content as a shadowed "sheet".
- **`S.box(opts | content)`** — a surface with optional `header`/`footer` and a
  padded body. Pass a function as a shorthand for `content`.
- **`S.tabs(opts)`** — a `tablist` + live panel, with full keyboard navigation.
- **`S.form(opts | content)`** — opinionated `<form>` that aligns fields in a
  column (or a responsive `grid`) and provides an `actions` bar. Prevents the
  default page reload.

### Form fields

- **`S.textline(opts)`** — single-line `<input>` (`text`, `password`, `email`,
  `number`, `tel`, `url`, `search`, dates, ...).
- **`S.textarea(opts)`** — multi-line input.
- **`S.checkbox(opts)`** — labelled checkbox.
- **`S.select(opts)`** — single-select dropdown backed by a native `<select>`.
  The control is styled; the OS renders the drop-down list.
- **`S.autocomplete(opts)`** — a type-ahead combobox; supports `multi` (chips),
  `allowCustom` (free text), `required`, and dynamic `options`.

### Dialogs

- **`S.dialog(opts)`** — dialog rendered into `document.body`, with a dimming
  backdrop and fade transition. Lifecycle is tied to the calling reactive scope
  (the dialog disappears when that scope is cleaned up). The `content` slot's
  draw function receives a `close()` function. Nested dialogs stack correctly.
  `S.alert` / `S.confirm` / `S.prompt` are promise-returning shortcuts.

### Actions

- **`S.button(opts | "text")`** — a button surface; restyle it via `attrs`
  (e.g. `".danger"`, `".neutral .outlined"`), plus `size`, `disabled`, `icon`,
  and `href` (renders an `<a role=button>`). Defaults to a filled `.primary`.
- **`S.buttonGroup(opts)`** — groups buttons, `attached` (segmented) or `spaced`.
- **`S.buttonChooser(opts)`** — single-select segmented control bound to a value.

Two-way binding uses Aberdeen observables: pass `bind: A.ref($obj, "key")` (or
any `{ value }` proxy) to fields.

## Reactive options

An options object — or any part of it — **may be an Aberdeen proxy**. Mutate it
later and the affected part of the component re-renders in place:

```ts
const $opts = A.proxy({ text: "Save", disabled: false });
S.button($opts);
// ...later:
$opts.disabled = true;   // the button updates, nothing else re-renders
```

## Rich text

Wherever a component takes a text **slot** — a `label`, a `header`/`footer`, a
button's `text`, a dialog body, ... — a plain string is rendered as **rich
text**: a small markdown-like syntax with `*italic*`, `**bold**`, `` `code` ``
and `[links](/path)`. All text is safely escaped. For anything more, pass a
draw function instead of a string.

```ts
S.button({ text: "Save **now**" });
S.box({ header: "See the [docs](/docs)", content: () => { ... } });
```

## Surfaces & theming

Staffa is built on **surfaces**. A surface is any element marked `.s-s`: it has
its own background and a legible set of text/border tokens derived from it. Add
modifier classes to colour it:

- **level**: `.base` (page), `.panel` (card), `.raised` (chrome)
- **role**: `.primary`, `.neutral`, `.danger`, `.success`, `.warning`
- **variant**: `.filled` (default), `.tonal`, `.outlined`

Components are built from these (`S.button` is a `.s-s.primary`, `S.box` a
`.s-s.panel`, ...), and because `attrs` is applied last you can override the look
from the outside — `S.button({ attrs: ".danger .outlined" })`.

Inside any surface, widgets read its tokens (`$s-fg`, `$s-bg`, `$s-fg-muted`,
`$s-border`, `$s-accent`, `$s-link`, ...) so they adapt automatically to wherever
they're nested. Colours all come from a small palette set on `:root` per mode —
re-skin by overriding those custom properties:

```ts
A(() => A.insertGlobalCss({ ":root": S.getDarkMode() ? "--s-primary:#28c4a0" : "--s-primary:#1f9d6b" }));
A.insertGlobalCss({ ".s-s.panel": "--s-b:#efe9dd" }); // restyle a level/role
```

See `src/theme.ts` for the full token list and the palette.

### Dark / light mode

Staffa follows the OS preference by default. Override it at runtime:

```ts
S.setDarkMode(true);      // force dark
S.setDarkMode(false);     // force light
S.setDarkMode(undefined); // follow OS again
```

The choice is persisted to `localStorage` and applied before the first paint
(no flash). `S.getDarkMode()` returns the resolved boolean; pass `true` to get
`undefined` when in "auto" mode (useful for a dark/light/auto control).

All Staffa styles are **global** and use `s-`-prefixed class names, so you can
also override anything from your own stylesheet.

## Browser (no bundler)

`staffa/all.js` is a pre-built ESM bundle that includes all of Staffa but keeps
Aberdeen external. Use an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
to tell the browser where to find both:

```html
<script type="importmap">
{
  "imports": {
    "aberdeen": "https://cdn.jsdelivr.net/npm/aberdeen/dist/src/aberdeen.js",
    "staffa/all.js": "https://cdn.jsdelivr.net/npm/staffa/dist/staffa.esm.js"
  }
}
</script>
<script type="module">
  import A from "aberdeen";
  import S from "staffa/all.js";
  // ...
</script>
```

Aberdeen stays external so if your app already loads it you won't get two
independent copies.

## Demo & development

```sh
npm run build      # compile TypeScript to dist/
npx serve .        # then open /demo/ in a browser
```

`npm run smoke` builds and renders every component in jsdom as a quick check.

Contributing or extending Staffa? See [`AGENTS.md`](./AGENTS.md) for the design
philosophy and the add-a-component checklist.

## Changelog

- 0.2.1 (2026-06-06): More flexible theming and component instance styling
- 0.1.0 (2026-06-05): Initial release!

# Skye

A small, opinionated component library for the
[Aberdeen](https://aberdeenjs.org) reactive UI library.

Skye components are **plain functions** that draw DOM through Aberdeen — no JSX,
no web components, no build step required. You import a single `S` object and
call its methods:

```ts
import A from "aberdeen";
import S from "skye";

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

Skye ships a **dark theme** by default and looks reasonable out of the box.

> **Pre-1.0 notice:** Skye's API is likely to change fairly often before stabilising as 1.0. That shouldn't stop you from using it — the library is small enough that any breaking changes are easy to adapt to yourself.

## Install

```sh
npm install skye aberdeen
```

Aberdeen is a **peer dependency** — Skye builds on your app's single copy of
Aberdeen rather than bundling its own (two copies of Aberdeen would mean two
independent reactivity systems). So install `aberdeen` alongside `skye`.

Skye is published as ESM with TypeScript types.

## Components

Every component takes a single typed options object. Common options are shared
across all components:

| Option     | On                       | Meaning                                                              |
| ---------- | ------------------------ | ------------------------------------------------------------------- |
| `root`     | every component          | Aberdeen attr/style string for the outermost element                |
| `content`  | container components     | a `() => void` draw function for the children                       |
| `inner`    | container components     | attr/style string for the element holding the children             |
| `control`  | form fields              | attr/style string for the actual input element                      |
| `label` / `help` / `error` / `disabled` / `required` / `name` | form fields | standard field chrome |

`root`/`inner`/`control` are [Aberdeen style strings](https://aberdeenjs.org),
e.g. `"display:flex gap:$3 .my-class"`. (Write `display:flex`, not bare `flex`.)

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

- **`S.modal(opts)`** — dialog rendered into `document.body`, with a dimming
  backdrop and fade transition. Lifecycle is tied to the calling reactive scope
  (the modal disappears when that scope is cleaned up). The `content` callback
  receives a `close()` function. Nested modals stack correctly.

### Actions

- **`S.button(opts | "text")`** — `variant` is `filled` | `tonal` | `outlined`;
  `color` is `primary` | `neutral` | `danger` | `success`; plus `size`,
  `disabled`, `icon`, and `href` (renders an `<a role=button>`).
- **`S.buttonGroup(opts)`** — groups buttons, `attached` (segmented) or `spaced`.

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

## Theming

Skye is themed via CSS custom properties. `S.darkTheme` and `S.lightTheme` are
live Aberdeen proxies — mutate them to restyle either scheme; changes flow into
the CSS variables immediately:

```ts
S.darkTheme.sPrimary = "#28c4a0";
S.darkTheme.sPrimaryFg = "#08110d";
S.lightTheme.sRadius = "6px";
```

See the `Theme` type for all variables (`sBg`, `sSurface`, `sFg`, `sBorder`,
`sPrimary`, `sDanger`, `sSuccess`, `sRadius`, `sShadow`, ...).

### Dark / light mode

Skye follows the OS preference by default. Override it at runtime:

```ts
S.setDarkMode(true);      // force dark
S.setDarkMode(false);     // force light
S.setDarkMode(undefined); // follow OS again
```

The choice is persisted to `localStorage` and applied before the first paint
(no flash). `S.getDarkMode()` returns the resolved boolean; pass `true` to get
`undefined` when in "auto" mode (useful for a dark/light/auto control).

All Skye styles are **global** and use `S_`-prefixed class names, so you can
also override anything from your own stylesheet.

## Browser (no bundler)

`skye/all.js` is a pre-built ESM bundle that includes all of Skye but keeps
Aberdeen external. Use an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
to tell the browser where to find both:

```html
<script type="importmap">
{
  "imports": {
    "aberdeen": "https://cdn.jsdelivr.net/npm/aberdeen/dist/src/aberdeen.js",
    "skye/all.js": "https://cdn.jsdelivr.net/npm/skye/dist/skye.esm.js"
  }
}
</script>
<script type="module">
  import A from "aberdeen";
  import S from "skye/all.js";
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

Contributing or extending Skye? See [`AGENTS.md`](./AGENTS.md) for the design
philosophy and the add-a-component checklist.

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
- **`S.autocomplete(opts)`** — a type-ahead combobox; supports `multi` (chips),
  `allowCustom` (free text), `required`, and dynamic `options`.

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

Skye is themed via CSS custom properties. Override any subset with `setTheme`:

```ts
import { setTheme } from "skye";

setTheme({
  sPrimary: "#28c4a0",
  sPrimaryFg: "#08110d",
  sRadius: "6px",
});
```

See the `Theme` type for all variables (`sBg`, `sSurface`, `sFg`, `sBorder`,
`sPrimary`, `sDanger`, `sSuccess`, `sRadius`, `sShadow`, ...). Because they're
real CSS variables, changes apply instantly to everything on screen.

All Skye styles are **global** and use `S_`-prefixed class names, so you can
also override anything from your own stylesheet.

## Demo & development

```sh
npm run build      # compile TypeScript to dist/
npx serve .        # then open /demo/ in a browser
```

`npm run smoke` builds and renders every component in jsdom as a quick check.

Contributing or extending Skye? See [`AGENTS.md`](./AGENTS.md) for the design
philosophy and the add-a-component checklist.

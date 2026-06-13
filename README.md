# Staffa

A small, opinionated TypeScript component library for the [Aberdeen](https://aberdeenjs.org) reactive UI library.

```ts
import A from "aberdeen";
import * as S from "staffa";

const $user = A.proxy({ name: "", email: "" });

S.main({
  title: "Sign up",
  maxWidth: "40rem",
  content: () => {
    S.form({
      submit: () => console.log(A.unproxy($user)),
      content: () => {
        S.textline({ label: "Name", required: true, bind: A.ref($user, "name") });
        S.textline({ label: "Email", type: "email", bind: A.ref($user, "email") });
      },
      actions: () => S.button({ content: "Create account", type: "submit" }),
    });
  },
});
```

Staffa is made to look decent out of the box, but easily customizable at runtime.

## Install

```sh
npm install staffa aberdeen
```

Aberdeen is a peer dependency. Staffa is published as ESM with TypeScript types.

## How it works

### Components are functions

Every component takes a single typed options object and draws DOM via Aberdeen. No classes, no web components. The `S` object collects all component functions:

```ts
S.button({ content: "Save", disabled: false });
S.box({ header: "Settings", content: () => { ... } });
```

### Options objects are typed and can be reactive

All components get their options in a typed object. The object may be an Aberdeen proxy, if you want to update the component in-place.

```ts
const $btn = A.proxy({ content: "Save", disabled: false });
S.button($btn);
setTimeout(() => // Later..
  $btn.disabled = true;  // button updates instantly
}, 3000);
```

### Rich text slots

Anywhere a component takes content, a `label`, `header`, button `text`, dialog body, etc, you can pass either a string or a `() => void` draw function. Strings render as **rich text**: `*italic*`, `**bold**`, `` `code` ``, `[link](/path)`. All text is safely escaped.

```ts
S.button({ content: "Save **now**" });
S.box({ header: "See the [docs](/docs)", content: () => { ... } });
```

### Surfaces

Staffa builds on **surfaces**: elements marked with `.s-s` that have their own background and derived text/border tokens. Add modifier classes to colour them:

- **level**: `.base`, `.panel`, `.raised`
- **role**: `.primary`, `.secondary`, `.gradient`, `.neutral`, `.danger`, `.success`, `.warning`
- **variant**: `.filled`, `.tonal`, `.outlined`

Components are built from these (`S.button` is a `.s-s.primary.filled`, `S.box` a `.s-s.panel`, etc.). Because component options include an optional `attrs` string, which has Aberdeen `A()` string semantics, you can easily override it:

```ts
S.button({ content: "Delete", attrs: ".danger" });
S.box({ attrs: ".raised.outlined", content: () => { ... } });
```

Inside any surface, CSS variables are defined for suitable foreground colors (`$s-fg`, `$s-bg`, `$s-fg-muted`, `$s-border`, `$s-accent`, ...), with `color` defaulting to `$s-fg`. By using these, components has access to various foreground colors that will look regardless of the surface it is drawing on.

### Dark and light modes

Dark/light mode is detected from OS preference by default. If you want to override this (based on user preferences), use:

```ts
S.setDarkMode(true);       // force dark
S.setDarkMode(false);      // force light
S.setDarkMode(undefined);  // follow OS
```

*Hint:* A `buttonChooser` is probably the right component for a color scheme selector.

### CSS reset

Staffa includes a lightweight CSS reset that makes bare semantic HTML look a bit better but unsurprising without additional styling. 

### Theming

The first step in theming is just setting some CSS variables, most commonly the primary and secondary color. This can be done through CSS directly, or using Aberdeen:

```ts
A.cssVars["s-primary"] = "#fdda58";
A.cssVars["s-secondary"] = "#cc5624";
A.cssVars["s-danger"] = "#ee4422";
A.cssVars["s-radius"] = "4px";
```

See `src/theme.ts` for what other CSS variables are being used.

If you need further customization, just add some CSS to override the default styling. For instance, to add your own surface type:

```ts
// In filled mode, 's-a' is the foreground and 's-b' is the background. "outlined" and "tonal" use the colors in different ways.
A.insertGlobalCss({".s-s.my-surface": "--s-a:white --s-b:#ef6b00"});

S.button({
  content: "You'll want to click me",
  attrs: ".my-surface",
  click: () => S.alert("Good work!", {attrs: ".my-surface"})
});
```

Note that when changing CSS like this, things *may* break if you upgrade Staffa. The recommended update strategy is therefore: don't!

If you want to make changes that are dependent upon the current light/dark mode setting, rely on Aberdeen reactivity:

```ts
A(() => {
  if (S.getDarkMode()) {
    A.cssVars["s-primary"] = "#aa9944";
    A.insertGlobalCss({".s-s.my-surface": "--s-a:white --s-b:#444444"});
  } else {
    A.cssVars["s-primary"] = "#fdda58";
    A.insertGlobalCss({".s-s.my-surface": "--s-a:black --s-b:#cccccc"});
  }
});
```

## Components

Components share naming conventions for options: `attrs` (outermost element), `contentAttrs` (children-holding element), `inputAttrs` (form control element), and `<region>Attrs` (sub-regions like `headerAttrs`/`footerAttrs`). Form components consistently support `label`, `help`, `error`, `disabled`, `required`, `name` through the `drawField()` helper.

### Layout & containers

- **`S.main(opts)`**: app shell, a sticky header with `icon`, `title`, `subtitle`, `menu`; scrollable content area; footer. Set `maxWidth` to center the content.
- **`S.box(opts | content)`**: surface with optional `header`/`footer` and padded body. Pass a function for shorthand `{ content }`.
- **`S.tabs(opts)`**: tablist with live panels and keyboard navigation.
- **`S.form(opts | content)`**: form aligning fields in a column or responsive grid, with an `actions` bar. Prevents the default page reload.

### Form fields

- **`S.textline(opts)`**: single-line input (`text`, `password`, `email`, `number`, `tel`, `url`, `search`, dates, ...).
- **`S.textarea(opts)`**: multi-line input.
- **`S.checkbox(opts)`**: labelled checkbox.
- **`S.select(opts)`**: single-select dropdown backed by native `<select>` (styled control, OS dropdown).
- **`S.autocomplete(opts)`**: type-ahead combobox with `multi` (chips), `allowCustom` (free text), `required`, and dynamic `options`.

### Dialogs

- **`S.dialog(opts)`**: modal dialog with backdrop and fade transition. The `content` slot receives a `close()` function. Lifecycle is tied to the calling scope (disappears when cleaned up). Nesting stacks correctly.
- **`S.alert(msg)` / `S.confirm(msg)` / `S.prompt(msg, initial?)`**: promise-returning shortcuts.

### Actions

- **`S.button(opts | text)`**: button surface; restyle via `attrs` (e.g. `.danger`, `.outlined`), plus `size`, `disabled`, `icon`, `href` (renders `<a role=button>`). Defaults to filled `.primary`.
- **`S.buttonGroup(opts)`**: groups buttons, `attached` (segmented) or `spaced`.
- **`S.buttonChooser(opts)`**: single-select segmented control bound to a value.


### Icons

Staffa ships the full [Lucide icon set](https://lucide.dev/icons/) as named exports. Import only the ones you use, so a bundler tree-shakes the rest (the whole set is ~82 kB gzipped):

Each icon is a draw function usable anywhere a slot is accepted (e.g. a button `icon`), or called directly. Customize per call, or globally via `setDefaults()`:

```ts
import * as S from "staffa";
import { sparkles, bell } from "staffa/icons";
S.button({ content: "Save", icon: bell });
sparkles({ size: "1.5em", color: "var(--s-primary)", strokeWidth: 1.5 });
```

Options: `size`, `color` (defaults to `currentColor`), `strokeWidth`, `cap`, `join`, `attrs`.

### Other

- **`S.menuButton(opts)` / `S.addContextMenu(opts)` / `S.showFloatingMenu(opts)`**: dropdown menus from a button, right-click/long-press context menus, and the underlying floating menu primitive — with keyboard navigation.
- **`S.toast(opts)`**: transient notification at the bottom of the viewport.
- **`S.addTooltip(el, opts)`**: tooltip on hover, attached to an existing element.

Two-way binding uses Aberdeen proxies: pass `bind: A.ref($obj, "key")` to form fields.

## Browser (no bundler)

`staffa/all.js` is a pre-built ESM bundle. Use an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap):

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
  import * as S from "staffa/all.js";
  // ...
</script>
```

It includes all components, but not the icons.

## Extending Staffa

Staffa is designed for extension. A component is simply a plain function taking a typed options object and drawing Aberdeen DOM. This section explains the philosophy so extensions follow the same patterns.

### Design principles

1. **Components are functions**. They take one typed options object, emit Aberdeen DOM, and *usually* return nothing.

2. **Reuse option types.** Define options by extending `ContentOptions` (for layout components) or `FieldOptions` (for form controls) from `src/core.ts` and `src/components/field.ts`. Don't reinvent fields like `attrs`, `label`, `help`, etc.

3. **Reach for reactivity deliberately.** Pass option strings straight to `A` as positional args (the caller's scope). Only wrap a dedicated `A(() => ...)` scope where it matters: input elements (recreation loses focus), or large subtrees you don't want to redraw. Use `A.peek(() => ...)` when you need a value but must not subscribe.

4. **Build on surfaces.** Mark elements `.s-s` and add level/role/variant modifiers. Inside them, use the contextual foreground color CSS variables (`$s-fg`, `$s-bg`, `$s-border`, ...) so components adapt to wherever they're nested. Hard-coding colors in components shouldn't be needed, but if you must, make sure you set *both* foreground and background.

5. **No outer margins.** Components don't margin themselves; spacing is the parent's job. Content components set default `padding` on the content element; `contentAttrs` overrides it.

6. **Make everything styleable.** Provide `attrs`, `contentAttrs`, `inputAttrs`, and `<region>Attrs` hooks so callers can customize. Apply `attrs` last so it can override component classes.

7. **Use semantic HTML and ARIA.** Prefer native elements (`<button>`, `<label>`, `<form>`, `<section>`) and native behaviour. Add ARIA only where semantics fall short (e.g. tabs, combobox).

8. **Use CSS.** Use `A.insertGlobalCss({...})` at module top level to provide (nested) CSS styling for your component. Give your top-level element the `s-<component-name>` class. Avoid inventing further classes; lean on nesting (`&` for the element, bare key for descendants) and element/structural selectors.  

9. **Reuse form controls.** Use `drawField()` and call `applyControlAttrs()`.

10. **Function over form.** Provide enough contrast. Stick to UI conventions to help users; buttons have a rounded border, links are underlined, text input background is white, etc.

### Adding a component to Staffa

The previous section is good advice for any project-specific custom, but should definitely be followed for any new components to be included in Staffa. In addition, you'd want to: 

1. Create `src/components/<name>.ts`.
2. Define `<Name>Options` extending `ContentOptions`, `FieldOptions`, or a plain interface. Add TSDoc on every option.
3. Add a TSDoc `@example` on the function.
4. Register in `src/index.ts` (the `S` object + type re-export).
5. Extend `smoke.mjs` to render it. Run `npm run smoke` and `npm run build`.

See `src/components/button.ts` and `src/components/dialog.ts` for examples.

## Commands

```sh
npm run build      # compile TypeScript to dist/
npm run typecheck  # check types
npm run smoke      # render every component in jsdom
npx http-server    # allows demo to be viewed at http://localhost:8080/demo
npx shotest test   # visual tests: click through the demo, screenshotting every step
npx shotest review # review/accept the visual changes against the baseline
```

The visual tests (`tests/*.spec.ts`) need a build first (`npm run build`); they serve the repo root themselves and click through every demo page. Accepted baselines live in `test-accepted/`.

## AI skill

If you use Claude Code, GitHub Copilot or another AI agents that supports Skills, Staffa includes a `skill/` directory that provides specialized knowledge to the AI about how to use the library effectively.

To use this, it is recommended to symlink the skill into your project's `.claude/skills` directory:

```sh
mkdir -p .claude/skills
ln -s ../../node_modules/staffa/skill .claude/skills/staffa
```

## Breaking changes

- **0.4**
  - There is no default export anymore: replace `import S from "staffa"` with `import * as S from "staffa"`.
  - `S.button` no longer has a `text` option: use `content` instead (it accepts a string or a draw function).
  - The `Content` type is gone: use `Slot` instead. The `Styling` type alias is now exported as `Attributes`.
  - `S.buttonChooser` uses `undefined` instead of `null` for "nothing selected" (in `bind` and with `allowDeselect`).
  
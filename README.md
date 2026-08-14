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
      submit: () => S.dialog({
        header: "Submitted",
        content: () => A.dump($user)
      }),
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

## Screenshot

![Screenshot](screenshot.png)

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

Staffa builds on **surfaces**: elements marked with `.s-s` that have their own background and derived text/border tokens. There are two families:

- **Neutral surfaces** — `.neutral` (and the implicit page at `:root`). A calm neutral whose shade steps automatically with nesting depth (each level a step away from the page colour, up to a cap). Use them for cards, bars, popovers — anything that just holds content. No variants.
- **Accent surfaces** — `.primary`, `.danger`, `.success`, `.warning`, `.link` (a bare `.s-s` defaults to primary). A bright fill with white ink, painted as a subtle single-colour gradient. They take a **variant**: `.filled` (default), `.tonal`, or `.outlined`. A surface nested *inside* an accent surface is always rendered filled, so it can't bleed into the vivid parent.

Components are built from these (`S.button` is a `.s-s.primary`, `S.box` a `.s-s.neutral`, etc.). Because component options include an optional `attrs` string, which has Aberdeen `A()` string semantics, you can easily override it:

```ts
S.button({ content: "Delete", attrs: ".danger" });
S.button({ content: "Cancel", attrs: ".neutral" });       // neutral button
S.box({ attrs: ".primary", content: () => { ... } });
```

Inside any surface (including `:root`), CSS variables are defined for the background and a set of safe foreground colors: `$s-bg`, `$s-text` (also applied as `color`), `$s-muted`, `$s-accent` (the surface's "pop" — the brand primary on neutral surfaces, the ink on accent surfaces), and `$s-faint`. By using these, components adapt to wherever they're nested.

The colour tokens are mode-independent and settable: `$s-primary` (the one brand colour — it tints the neutrals and defines `.s-s.primary`), `$s-danger`, `$s-success`, `$s-warning`, and `$s-link` (the link colour, which is also the fill of the `.s-s.link` surface). Links render in `$s-link` on neutral surfaces and in the ink on accent surfaces.

**Borders & shadows.** Neutral surfaces carry a subtle hairline border on their own (so a card looks like a card without any component help). Any surface can be lifted with `.shadow` or `.extra-shadow`: on a neutral surface that's a neutral drop shadow, on an accent surface it's a self-coloured glow (a lit button is just a `.primary` surface with `.shadow`), and on `.tonal`/`.outlined` it's ignored. `.no-shadow` removes a component's built-in shadow:

```ts
S.box({ attrs: ".extra-shadow", content: () => { ... } });   // a more raised card
S.button({ content: "Quiet", attrs: ".no-shadow" });          // drop the button glow
```

### Dark and light modes

Dark/light mode is detected from OS preference by default. If you want to override this (based on user preferences), use:

```ts
S.setDarkMode(true);       // force dark
S.setDarkMode(false);      // force light
S.setDarkMode(undefined);  // follow OS
```

*Hint:* A `buttonChooser` is probably the right component for a color scheme selector.

### Panel-stack navigation

Give `S.main()` a `routes` table instead of a `content` slot, and it takes over navigation for you. Each route draws one screen of your app. Staffa calls those screens **panels**, and it shows as many of them at a time as comfortably fit.

On a phone that means one panel at a time: a link opens a new panel on top of it, and closing that one brings the previous back, the way most mobile apps work. On a wider screen, panels that would have covered each other sit side by side instead. Pick a project from a list and it opens *beside* the list; pick another and it takes the first one's place. Your code doesn't know the difference.

```ts
S.main({
  title: "Trackle",
  nav: { items: [{ label: "Projects", href: "/projects" }] },
  routes: {
    "/projects": drawProjectList,
    "/projects/[projectId]": drawProject,
    "/projects/[projectId]/tasks/[taskId=integer]": drawProjectTask,
  },
  notFound: ($page) => S.box({ header: "Not found", content: $page.path }),
});

function drawProject($page: S.Page<{ projectId: string }>) {
  const { projectId } = $page.params;    // typed from the route key
  A(`a href=/projects/${projectId}/tasks/1 #Open the first task`);
}

// Etc..
```

Each handler gets a `$page` object holding the params from its route, along with the things Staffa needs to know about the panel: its title, how much room it wants, whether it's still loading. It's an Aberdeen proxy, so you can set those later (when your data arrives, say) and the shell keeps up.

**Route keys.** A segment wrapped in brackets is a param:

- `[name]` matches one segment, as a string.
- `[name=integer]` matches one segment, as a number.
- `[...name]` matches the rest of the path, as a string. It has to be the last thing in the key, and it needs at least one segment to match.

The first key that matches wins, and a segment a param refuses simply doesn't match, so it falls through to a later route, or to `notFound`. TypeScript reads each key and types that handler's `$page.params` from it, so `params.taskId` above really is a `number`.

`integer` only accepts spellings that survive a round trip back to the same URL: `42` and `-7` and `0`, but not `007`, `1.5`, `0x10`, `-0` or anything past `Number.MAX_SAFE_INTEGER`. Otherwise `/tasks/42` and `/tasks/0042` would be two different paths for one record, and could sit open in two panels at once. For ids that aren't safe integers, such as snowflakes, use a plain `[id]` and keep them as strings.

`[...name]` hands you the remaining path exactly as it appears in the URL, still percent-encoded. Decoding it for you would be lossy: an encoded slash inside a segment would come back looking just like a separator. When you want the pieces, `name.split("/").map(decodeURIComponent)` gives them to you. (Single-segment params have no such ambiguity, so those *are* decoded.)

**Navigating is just links.** Write ordinary `<a href="/...">` links; Staffa handles the clicks (so don't also call Aberdeen's `interceptLinks()`).

- A link inside a panel opens its target on top of that panel, closing anything that was above it first. That's why clicking a second project replaces the open project instead of adding a third column.
- Add `data-panel=replace` and the link replaces the panel it sits in, rather than opening on top of it. That's what you want for prev/next buttons.
- A link to something that's already open goes back to it instead of opening it twice. The same path is never in the stack twice.
- A link that isn't inside a panel (a nav item, or one in a dialog) has no panel to build on, so it replaces the stack as a whole: the page you asked for, with its ancestor pages opened beneath it (see [below](#ancestors)). Panels that the new stack also contains stay as they are, so clicking the nav item for the section you're already in won't reset it. Clicking a nav item and opening that same URL in a fresh tab therefore give you the same columns.

From code, `S.panels.push(path)` opens a panel on top of the top one, `.replace(path)` opens one in place of the top one, and `.close(path?)` closes the top panel (or a named one). `S.panels.stack` is the list of open paths.

**How much room a panel takes** is up to `$page.layout`. The content area is the page, at most 1280px wide, minus the nav sidebar:

| `layout` | How wide the panel gets | Good for |
| --- | --- | --- |
| `"small"` | 360 to 540px once two fit side by side. Below that, the whole content area (so up to ~730px). | lists, detail forms, anything that reads well at phone width |
| `"medium"` (default) | The whole content area: up to ~1100px, and the screen width on a phone. | ordinary screens; the safe default |
| `"large"` | The whole window, with no upper limit: ~1750px on a 1920px screen. | boards, wide tables, dense dashboards |

Those numbers assume a nav sidebar of around 170px; without a sidebar, add that back (a medium then reaches the full 1280px). Nothing fits beside a medium on a standard 1280px page, but on a wide enough window a small still can, and the page grows past 1280px to hold both.

A panel's width depends only on the size of the window, never on what else is open. So opening or closing a panel never resizes the ones already on screen, and never reflows what someone was reading. A lone small leaves its other half empty, and that is exactly where the next small lands. When more columns fit than the standard 1280px page holds (three smalls, say), the page itself grows, staying centred, to hold them.

**The rest of `$page`:**

- `params` and `path`: read-only.
- `title`: shown in `document.title` while this panel is the top one.
- `layout`: as above. It's read once, right after your handler runs, so set it there.
- `loading`: set it while you're fetching. A new panel waits a moment before sliding in, so it can arrive with real content instead of empty, and shows a loading indicator if the wait drags on.
- `close()`: closes this panel, wherever it sits in the stack.
- `requestClose`: your chance to say no. Everything that would close the panel waits for it: Escape, the panel's own ✕ or Cancel button, the browser's back button, a link that would close it, `S.panels.close()`. Return `false` to keep the panel open.

```ts
$page.requestClose = async () => !$task.dirty || await S.confirm("Discard unsaved changes?");
```

**Every panel provides its own way out.** Staffa draws no back arrows and no ✕ of its own, because a panel knows better than the shell does what leaving it should look like: Cancel and Save buttons, or a ✕ in the corner of a box. So say it yourself:

```ts
S.box({ header: "Task 42", close: true, content: drawTask });   // a ✕ in the box's corner
S.button({ content: "Cancel", attrs: ".neutral", click: () => $page.close() });
S.panels.close();              // the top panel
S.panels.close("/projects/7"); // that panel, wherever it is
```

`S.box`'s `close: true` works out for itself which panel it's in, so the same code closes the right thing whether it's one column of several or a whole phone screen. (Pass a function instead if you'd rather do something else.)

Closing the top panel goes back to whatever was underneath it. Closing one that *isn't* on top takes just that one away: the columns to its right stay where they are and keep their state, and the URL doesn't change, because the top panel didn't move. Either way it becomes a history entry, so the browser's back button brings the panel back.

Staffa itself contributes two things: the Escape key, which closes the top panel (and jumps to the navigation once you're at the bottom of the stack), and making the browser's back button do the right thing. Both ask `requestClose` first.

<a id="ancestors"></a>

**The back button, and links from elsewhere.** The URL holds the top panel; the rest of the stack is stored beside it in the browser's history entry. So back and forward step through whole arrangements of columns, and a reload brings the same columns back.

A URL that arrives without any of that (a shared link, a bookmark, a new tab) has nothing to restore, so Staffa builds the stack from the path: it walks the parent paths and opens each one you have a route for. With the routes above, `/projects/7/tasks/42` opens as three panels: the project list, project 7, and task 42. A parent path you have no route for is skipped, so if you don't want one screen appearing under another, just don't give it a route.

Search params and the `#hash` belong to the top panel only. Anything a panel deeper in the stack needs in order to redraw itself has to live in its path.

**A few more things.**

- `stacking: false` shows only the top panel, however wide the screen. Everything else behaves the same: the URL, the back button, `requestClose`, and the panels' own close buttons.
- Only one routed `S.main()` can be mounted at a time; a second one throws. That's what lets `S.panels` be a plain module-level object. Each handler still gets its own `$page` rather than there being one global "current page", since several panels are alive at once.
- Navigating with `aberdeen/route`'s own `go()` works and still asks `requestClose`, but, like a link from outside a panel, it builds the whole stack from the path. So prefer `S.panels`. If your app registered its own navigation guard before mounting (an auth redirect, say), it keeps working: Staffa asks it first, and puts it back when the shell goes away.
- Deep links need your static server to serve the app for unknown paths (the usual SPA fallback). For `http-server` that's `-P`, as in the demo command below.

### CSS reset

Staffa includes a lightweight CSS reset that makes bare semantic HTML look a bit better but unsurprising without additional styling. 

### Theming

The first step in theming is just setting some CSS variables. Everything derives from a single brand colour, `s-primary` (the neutral surface shades are tinted toward it too), so often that's all you need. This can be done through CSS directly, or using Aberdeen:

```ts
A.cssVars["s-primary"] = "#fdda58";
A.cssVars["s-danger"] = "#ee4422";
A.cssVars["s-radius"] = "4px";
```

See `src/theme.ts` for what other CSS variables are being used.

If you need further customization, just add some CSS to override the default styling. For instance, to add your own accent surface, set its background (and, if needed, its ink) — the subtle gradient and the rest of the tokens follow automatically:

```ts
A.insertGlobalCss({".s-s.my-surface": "--s-bg:#ef6b00 --s-text:#fff"});

S.button({
  content: "You'll want to click me",
  attrs: ".my-surface",
  click: () => S.alert("Good work!", {attrs: ".my-surface"})
});
```

Custom surface class names may be anything (other than the built-in modifiers `.tonal`, `.outlined`, `.small`, `.large`). The `.tonal` and `.outlined` variants work on your surface for free.

Note that when changing CSS like this, things *may* break if you upgrade Staffa. The recommended update strategy is therefore: don't!

If you want to make changes that are dependent upon the current light/dark mode setting, rely on Aberdeen reactivity:

```ts
A(() => {
  if (S.getDarkMode()) {
    A.cssVars["s-primary"] = "#aa9944";
    A.insertGlobalCss({".s-s.my-surface": "--s-bg:#444444 --s-text:#fff"});
  } else {
    A.cssVars["s-primary"] = "#fdda58";
    A.insertGlobalCss({".s-s.my-surface": "--s-bg:#cccccc --s-text:#000"});
  }
});
```

## Components

Components share naming conventions for options: `attrs` (outermost element), `contentAttrs` (children-holding element), `inputAttrs` (form control element), and `<region>Attrs` (sub-regions like `headerAttrs`/`footerAttrs`). Form components consistently support `label`, `help`, `error`, `disabled`, `required`, `name` through the `drawField()` helper.

### Layout & containers

- **`S.main(opts)`**: app shell, a sticky header with `icon`, `title`, `subtitle`, `menu`; scrollable content area; footer. Set `maxWidth` to center the content. Give it a `nav` for a sidebar that collapses to a hamburger below 640 px — where the nav becomes a full page sliding in from the left, handing over to the chosen screen with a matching slide in from the right. Instead of a single `content` slot it can take a `routes` table — see [Panel-stack navigation](#panel-stack-navigation).
- **`S.box(opts | content)`**: surface with optional `header`/`footer` and padded body. Pass a function for shorthand `{ content }`. `close: true` adds a ✕ that closes the panel the box is in (see [Panel-stack navigation](#panel-stack-navigation)); `close: fn` runs your own dismissal.
- **`S.tabs(opts)`**: tablist with live panels and keyboard navigation. More tabs than fit make the strip scroll, with a ‹ / › button appearing at whichever end still has something to reach — so it's not just a swipe target. Selecting a tab any other way (the arrow keys, a `bind` written from elsewhere) scrolls it into view.
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
    "aberdeen/route": "https://cdn.jsdelivr.net/npm/aberdeen/dist/src/route.js",
    "aberdeen/transitions": "https://cdn.jsdelivr.net/npm/aberdeen/dist/src/transitions.js",
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

4. **Build on surfaces.** Mark elements `.s-s` and add `.neutral` or an accent role (`.primary`, `.danger`, …) plus an optional variant. Inside them, use the contextual CSS variables (`$s-text`, `$s-bg`, `$s-muted`, `$s-accent`, `$s-faint`, ...) so components adapt to wherever they're nested. Hard-coding colors in components shouldn't be needed, but if you must, make sure you set *both* foreground and background.

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
5. Add it to the demo, cover it in the visual tests (`tests/*.spec.ts`), and run `npm run build` and `npm run typecheck`.

See `src/components/button.ts` and `src/components/dialog.ts` for examples.

## Commands

```sh
npm run build      # compile TypeScript to dist/
npm run typecheck  # check types
npx http-server -P "http://localhost:8080/demo/index.html?"   # demo at http://localhost:8080/demo
                   # (-P is the SPA fallback the demo's routed URLs need)
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

- **0.7** — the surface model was reduced to two families: **neutral** (`.neutral`) and **accent** (`.primary`/`.danger`/`.success`/`.warning`/`.link`). Apps that only use the high-level `S.*` components need no changes. Code that uses surface classes or tokens directly must update:
  - **Surface levels gone.** Replace `.base`/`.panel`/`.raised`/`.neutral`/`.nest` with the single `.neutral` class.
  - **`.secondary` and `.gradient` gone.** Drop any `s-secondary` colour override; there's no `s-secondary` anymore. The default button is now `.primary`.
  - **Tokens renamed.** `--s-fg`→`--s-text`, `--s-fg-muted`→`--s-muted`, `--s-border`→`--s-faint`. Removed: `--s-fg-faint`, `--s-border-strong`, `--s-ink`, `--s-on-accent`, `--s-page`/`--s-panel`/`--s-raised`, `--s-neutral`, `--s-tint`, `--s-glow`, `--s-shadow`, `--s-gradient-surface`. A custom surface now sets `--s-bg`/`--s-text` (was the `--s-a`/`--s-b` anchors).
  - **Borders/shadows moved onto surfaces.** Components no longer draw their own border/shadow. If you relied on `S.box`/`S.dialog`/etc. elevation, it now comes from the surface; pass `.no-shadow` to drop it, or `.shadow`/`.extra-shadow` to add it on any surface.

- **0.6**: None.

- **0.5**
  - Surfaces (`.s-s`) now apply `border-radius` and — for `.tonal` and `.outlined` variants — `border` automatically. Custom surfaces or components that previously set these manually may see doubled or conflicting styles; remove the manual declarations.
  - `border:0` is now applied to `.s-btn` by default (overriding the browser's 2px button border). Custom button-like components built on `.s-btn` that relied on the browser default border should add an explicit border.

- **0.4**
  - There is no default export anymore: replace `import S from "staffa"` with `import * as S from "staffa"`.
  - `S.button` no longer has a `text` option: use `content` instead (it accepts a string or a draw function).
  - The `Content` type is gone: use `Slot` instead. The `Styling` type alias is now exported as `Attributes`.
  - `S.buttonChooser` uses `undefined` instead of `null` for "nothing selected" (in `bind` and with `allowDeselect`).
  